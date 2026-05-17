package td.universite_ndjamena.backend.controller;



import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import td.universite_ndjamena.backend.config.JwtAuthFilter;

import td.universite_ndjamena.backend.config.JwtService;

import td.universite_ndjamena.backend.model.SecuritySettings;

import td.universite_ndjamena.backend.service.AuthService;
import td.universite_ndjamena.backend.annotation.Auditable;

import td.universite_ndjamena.backend.service.SecuritySettingsService;



import java.util.Map;



@RestController

@RequestMapping("/api/auth")

@RequiredArgsConstructor

public class AuthController {



    private final JwtService jwtService;

    private final SecuritySettingsService securitySettingsService;

    private final AuthService authService;



    @PostMapping("/login")
    @Auditable(action = "LOGIN", entity = "AUTH")

    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {

        String email = request.get("email");

        String password = request.get("password");

        String deviceId = request.get("deviceId");



        AuthService.AuthActionResult result = authService.login(email, password, deviceId);

        return ResponseEntity.status(result.httpStatus()).body(result.body());

    }



    @PostMapping("/verify-2fa-login")

    public ResponseEntity<?> verifyTwoFactorLogin(@RequestBody Map<String, String> request) {

        String email = request.get("email");

        String code = request.get("code");

        String deviceId = request.get("deviceId");

        Map<String, Object> body = authService.verifyLoginTwoFactor(email, code, deviceId);

        return ResponseEntity.ok(body);

    }



    @PostMapping("/change-password")
    @Auditable(action = "PASSWORD_CHANGE", entity = "AUTH")

    public ResponseEntity<?> changePassword(

            Authentication authentication,

            @RequestBody Map<String, String> request) {



        if (authentication == null || !(authentication.getPrincipal() instanceof JwtAuthFilter.AuthPrincipal principal)) {

            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        }



        String current = request.get("currentPassword");

        String next = request.get("newPassword");

        authService.changePassword(principal.id(), current, next);

        return ResponseEntity.ok(Map.of("message", "Password updated"));

    }



    /** Password rules from DB-backed security settings — any authenticated user may read this for UX validation. */

    @GetMapping("/password-policy")

    public ResponseEntity<Map<String, Object>> passwordPolicy() {

        SecuritySettings settings = securitySettingsService.getSettings();

        return ResponseEntity.ok(Map.of(

                "minPasswordLength", settings.getMinPasswordLength(),

                "requireUppercase", Boolean.TRUE.equals(settings.getRequireUppercase()),

                "requireNumbers", Boolean.TRUE.equals(settings.getRequireNumbers()),

                "requireSpecialCharacters", Boolean.TRUE.equals(settings.getRequireSpecialCharacters())

        ));

    }



    @PostMapping("/forgot-password")
    @Auditable(action = "FORGOT_PASSWORD", entity = "AUTH")

    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {

        String email = request.get("email");

        return ResponseEntity.ok(authService.forgotPassword(email));

    }



    @PostMapping("/reset-password")
    @Auditable(action = "RESET_PASSWORD", entity = "AUTH")

    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {

        String email = request.get("email");
        String code = request.get("code");
        if (code == null || code.isBlank()) {
            code = request.get("verificationCode");
        }
        String newPassword = request.get("newPassword");

        authService.resetPasswordWithEmailCode(email, code, newPassword);

        return ResponseEntity.ok(Map.of("message", "Password has been reset. You can sign in with your new password."));

    }

    @PostMapping("/verify-reset-code")
    public ResponseEntity<?> verifyResetCode(@RequestBody Map<String, String> request) {

        String email = request.get("email");
        String code = request.get("code");
        String deviceId = request.get("deviceId");
        if (code == null || code.isBlank()) {
            code = request.get("verificationCode");
        }

        Map<String, Object> body = authService.verifyPasswordResetCodeAndLogin(email, code, deviceId);

        return ResponseEntity.ok(body);
    }

    @PostMapping("/logout")
    @Auditable(action = "LOGOUT", entity = "AUTH")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }



    @GetMapping("/heartbeat")

    public ResponseEntity<?> heartbeat(Authentication authentication, HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {

            return ResponseEntity.status(401).body(Map.of("error", "Missing token"));

        }



        String jwt = authHeader.substring(7);

        try {

            long issuedAtMs = jwtService.extractIssuedAt(jwt).getTime();

            SecuritySettings settings = securitySettingsService.getSettings();

            long timeoutMinutes = settings.getSessionTimeoutMinutes() == null ? 30L : settings.getSessionTimeoutMinutes();

            long maxAgeMs = timeoutMinutes * 60_000L;



            if (System.currentTimeMillis() - issuedAtMs > maxAgeMs) {

                return ResponseEntity.status(401).body(Map.of("error", "Session expired"));

            }

        } catch (Exception ex) {

            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));

        }



        return ResponseEntity.ok(Map.of(

                "status", "ok",

                "authenticated", authentication != null

        ));

    }

}

