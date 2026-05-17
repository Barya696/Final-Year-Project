package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.config.JwtService;
import td.universite_ndjamena.backend.model.SecuritySettings;
import td.universite_ndjamena.backend.model.TrustedDevice;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.repository.TrustedDeviceRepository;
import td.universite_ndjamena.backend.repository.UsersRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    public record AuthActionResult(int httpStatus, Map<String, Object> body) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    /** How long the emailed 6-digit reset code remains valid */
    private static final int PASSWORD_RESET_CODE_EXPIRY_MINUTES = 15;

    private final UsersRepository usersRepository;
    private final TrustedDeviceRepository trustedDeviceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecuritySettingsService securitySettingsService;
    private final PasswordResetEmailService passwordResetEmailService;

    @Value("${app.security.expose-dev-otp:false}")
    private boolean exposeDevOtp;

    @Value("${app.password-reset.expose-token-in-response:false}")
    private boolean exposeResetTokenInResponse;

    public AuthActionResult login(String email, String password, String deviceId) {
        if (email == null || password == null) {
            throw new IllegalArgumentException("Email and password are required");
        }

        Users user = usersRepository.findByEmail(email.trim()).orElse(null);
        SecuritySettings settings = securitySettingsService.getSettings();
        int maxAttempts = settings.getMaxPasswordAttempts() == null ? 5 : settings.getMaxPasswordAttempts();

        if (user == null) {
            return new AuthActionResult(401, errorBody("Invalid email or password"));
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return handleFailedPassword(user, maxAttempts);
        }

        if (user.getStatus() == Users.UserStatus.INACTIVE
                || user.getStatus() == Users.UserStatus.SUSPENDED) {
            return new AuthActionResult(403, errorBody("Your account has been blocked. Contact an administrator."));
        }

        clearFailedAttemptsIfNeeded(user);

        boolean require2fa = Boolean.TRUE.equals(settings.getRequireTwoFactor());
        String normalizedDevice = normalizeDeviceId(deviceId);

        if (require2fa) {
            boolean knownDevice = normalizedDevice != null
                    && trustedDeviceRepository.existsByUser_IdAndDeviceId(user.getId(), normalizedDevice);
            if (!knownDevice) {
                return new AuthActionResult(200, startTwoFactorChallenge(user));
            }
            touchTrustedDevice(user, normalizedDevice);
        } else if (normalizedDevice != null) {
            touchTrustedDevice(user, normalizedDevice);
        }

        return new AuthActionResult(200, buildLoginSuccess(user, settings));
    }

    public Map<String, Object> verifyLoginTwoFactor(String email, String code, String deviceId) {
        if (email == null || code == null || code.isBlank()) {
            throw new IllegalArgumentException("Email and verification code are required");
        }
        String normalizedDevice = normalizeDeviceId(deviceId);
        if (normalizedDevice == null) {
            throw new IllegalArgumentException("Device identifier is required");
        }

        Users user = usersRepository.findByEmail(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification"));

        if (user.getLoginOtpHash() == null || user.getLoginOtpExpiresAt() == null) {
            throw new IllegalArgumentException("No pending verification for this account");
        }
        if (user.getLoginOtpExpiresAt().isBefore(LocalDateTime.now())) {
            clearLoginOtp(user);
            throw new IllegalArgumentException("Verification code has expired. Sign in again.");
        }

        if (!passwordEncoder.matches(code.trim(), user.getLoginOtpHash())) {
            throw new IllegalArgumentException("Invalid verification code");
        }

        if (user.getStatus() == Users.UserStatus.INACTIVE
                || user.getStatus() == Users.UserStatus.SUSPENDED) {
            clearLoginOtp(user);
            throw new IllegalArgumentException("Your account has been blocked. Contact an administrator.");
        }

        clearLoginOtp(user);
        touchTrustedDevice(user, normalizedDevice);

        SecuritySettings settings = securitySettingsService.getSettings();
        return buildLoginSuccess(user, settings);
    }

    public void changePassword(Long userId, String currentPassword, String newPassword) {
        if (currentPassword == null || newPassword == null) {
            throw new IllegalArgumentException("Current and new passwords are required");
        }
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from your current password");
        }

        securitySettingsService.validatePasswordOrThrow(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        usersRepository.save(user);
    }

    public Map<String, Object> forgotPassword(String email) {
        String generic = "If an account exists for that email, password reset instructions have been sent.";
        if (email == null || email.isBlank()) {
            return Map.of("message", generic);
        }

        Optional<Users> opt = usersRepository.findByEmail(email.trim());
        if (opt.isEmpty()) {
            return Map.of("message", generic);
        }

        Users user = opt.get();
        int code = 100_000 + RANDOM.nextInt(900_000);
        String codeStr = String.valueOf(code);
        user.setPasswordResetToken(passwordEncoder.encode(codeStr));
        user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(PASSWORD_RESET_CODE_EXPIRY_MINUTES));
        usersRepository.save(user);

        log.info("Password reset code issued for {} — expires in {}m", user.getEmail(), PASSWORD_RESET_CODE_EXPIRY_MINUTES);
        try {
            passwordResetEmailService.sendPasswordResetCode(
                    user.getEmail(), codeStr, PASSWORD_RESET_CODE_EXPIRY_MINUTES);
        } catch (RuntimeException e) {
            log.error("Password reset email could not be sent for {}", user.getEmail(), e);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", generic);
        if (exposeResetTokenInResponse) {
            body.put("resetCode", codeStr);
        }
        return body;
    }

    /**
     * Completes password reset using the 6-digit code emailed to the account (hashed in DB; requires email to
     * disambiguate codes).
     */
    public void verifyPasswordResetCode(String email, String code) {
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            throw new IllegalArgumentException("Email and verification code are required");
        }
        String normalizedCode = code.trim().replaceAll("\\s+", "");
        if (!normalizedCode.matches("\\d{6}")) {
            throw new IllegalArgumentException("Verification code must be exactly 6 digits");
        }

        Users user = usersRepository.findByEmail(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));
        if (user.getPasswordResetToken() == null
                || user.getPasswordResetExpiresAt() == null
                || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }
        if (!passwordEncoder.matches(normalizedCode, user.getPasswordResetToken())) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }
    }

    public Map<String, Object> verifyPasswordResetCodeAndLogin(String email, String code, String deviceId) {
        String normalizedEmail = email == null ? null : email.trim();
        String normalizedCode = code == null ? null : code.trim().replaceAll("\\s+", "");
        verifyPasswordResetCode(normalizedEmail, normalizedCode);

        Users user = usersRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));
        if (user.getStatus() == Users.UserStatus.INACTIVE
                || user.getStatus() == Users.UserStatus.SUSPENDED) {
            throw new IllegalArgumentException("Your account has been blocked. Contact an administrator.");
        }

        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        user.setFailedLoginAttempts(0);
        usersRepository.save(user);

        String normalizedDevice = normalizeDeviceId(deviceId);
        if (normalizedDevice != null) {
            touchTrustedDevice(user, normalizedDevice);
        }

        SecuritySettings settings = securitySettingsService.getSettings();
        return buildLoginSuccess(user, settings);
    }

    /**
     * Completes password reset using the 6-digit code emailed to the account (hashed in DB; requires email to
     * disambiguate codes).
     */
    public void resetPasswordWithEmailCode(String email, String code, String newPassword) {
        if (email == null || email.isBlank() || code == null || code.isBlank() || newPassword == null) {
            throw new IllegalArgumentException("Email, verification code, and new password are required");
        }
        String normalizedEmail = email.trim();
        String normalizedCode = code.trim().replaceAll("\\s+", "");
        verifyPasswordResetCode(normalizedEmail, normalizedCode);
        Users user = usersRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));

        securitySettingsService.validatePasswordOrThrow(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        user.setFailedLoginAttempts(0);
        user.setStatus(Users.UserStatus.ACTIVE);
        clearLoginOtp(user);
        usersRepository.save(user);
        trustedDeviceRepository.deleteAllByUser_Id(user.getId());
    }

    private AuthActionResult handleFailedPassword(Users user, int maxAttempts) {
        int nextAttempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
        user.setFailedLoginAttempts(nextAttempts);

        if (nextAttempts >= maxAttempts) {
            user.setStatus(Users.UserStatus.INACTIVE);
            usersRepository.save(user);
            return new AuthActionResult(403, errorBody(
                    "Your account has been blocked after too many failed login attempts. Contact an administrator."));
        }

        usersRepository.save(user);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "Invalid email or password");
        body.put("remainingAttempts", Math.max(0, maxAttempts - nextAttempts));
        return new AuthActionResult(401, body);
    }

    private void clearFailedAttemptsIfNeeded(Users user) {
        if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
            user.setFailedLoginAttempts(0);
            usersRepository.save(user);
        }
    }

    private Map<String, Object> startTwoFactorChallenge(Users user) {
        int code = 100_000 + RANDOM.nextInt(900_000);
        String codeStr = String.valueOf(code);
        user.setLoginOtpHash(passwordEncoder.encode(codeStr));
        user.setLoginOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
        usersRepository.save(user);

        log.warn("2FA code for {} (new device): {} — configure email delivery for production", user.getEmail(), codeStr);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("requiresTwoFactor", true);
        body.put("email", user.getEmail());
        body.put("message", "This device is not trusted. Enter the verification code sent to your registered email.");
        if (exposeDevOtp) {
            body.put("devOtp", codeStr);
        }
        return body;
    }

    private void clearLoginOtp(Users user) {
        user.setLoginOtpHash(null);
        user.setLoginOtpExpiresAt(null);
        usersRepository.save(user);
    }

    private void touchTrustedDevice(Users user, String deviceId) {
        LocalDateTime now = LocalDateTime.now();
        trustedDeviceRepository.findByUser_IdAndDeviceId(user.getId(), deviceId)
                .map(td -> {
                    td.setLastUsedAt(now);
                    return trustedDeviceRepository.save(td);
                })
                .orElseGet(() -> trustedDeviceRepository.save(TrustedDevice.builder()
                        .user(user)
                        .deviceId(deviceId)
                        .trustedAt(now)
                        .lastUsedAt(now)
                        .build()));
    }

    private Map<String, Object> buildLoginSuccess(Users user, SecuritySettings settings) {
        long sessionTimeoutMinutes = settings.getSessionTimeoutMinutes() == null ? 30L : settings.getSessionTimeoutMinutes();
        long expirationMs = sessionTimeoutMinutes * 60_000L;
        String token = jwtService.generateToken(user, expirationMs);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("token", token);
        body.put("userId", user.getId());
        body.put("name", user.getName());
        body.put("email", user.getEmail());
        body.put("role", user.getRole().name());
        body.put("sessionTimeoutMinutes", sessionTimeoutMinutes);
        body.put("requiresTwoFactor", false);
        usersRepository.findDepartmentIdByUserId(user.getId()).ifPresent(id -> body.put("departmentId", id));
        return body;
    }

    private String normalizeDeviceId(String deviceId) {
        if (deviceId == null) return null;
        String t = deviceId.trim();
        return t.isEmpty() ? null : t;
    }

    private Map<String, Object> errorBody(String msg) {
        return Map.of("error", msg);
    }
}
