package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.model.SecuritySettings;
import td.universite_ndjamena.backend.repository.SecuritySettingsRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class SecuritySettingsService {

    private static final long SINGLETON_ID = 1L;
    private final SecuritySettingsRepository securitySettingsRepository;

    public SecuritySettings getSettings() {
        return securitySettingsRepository.findById(SINGLETON_ID).orElseGet(this::createDefaultSettings);
    }

    public SecuritySettings updateSettings(SecuritySettings incoming) {
        validateSettings(incoming);
        SecuritySettings current = getSettings();
        current.setMaxPasswordAttempts(incoming.getMaxPasswordAttempts());
        current.setSessionTimeoutMinutes(incoming.getSessionTimeoutMinutes());
        current.setMinPasswordLength(incoming.getMinPasswordLength());
        current.setRequireUppercase(Boolean.TRUE.equals(incoming.getRequireUppercase()));
        current.setRequireNumbers(Boolean.TRUE.equals(incoming.getRequireNumbers()));
        current.setRequireSpecialCharacters(Boolean.TRUE.equals(incoming.getRequireSpecialCharacters()));
        current.setRequireTwoFactor(Boolean.TRUE.equals(incoming.getRequireTwoFactor()));
        return securitySettingsRepository.save(current);
    }

    public void validatePasswordOrThrow(String password) {
        SecuritySettings settings = getSettings();
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        if (password.length() < settings.getMinPasswordLength()) {
            throw new IllegalArgumentException("Password must be at least " + settings.getMinPasswordLength() + " characters");
        }
        if (Boolean.TRUE.equals(settings.getRequireUppercase()) && password.chars().noneMatch(Character::isUpperCase)) {
            throw new IllegalArgumentException("Password must include at least one uppercase letter");
        }
        if (Boolean.TRUE.equals(settings.getRequireNumbers()) && password.chars().noneMatch(Character::isDigit)) {
            throw new IllegalArgumentException("Password must include at least one number");
        }
        if (Boolean.TRUE.equals(settings.getRequireSpecialCharacters())
                && password.chars().noneMatch(ch -> !Character.isLetterOrDigit(ch))) {
            throw new IllegalArgumentException("Password must include at least one special character");
        }
    }

    private SecuritySettings createDefaultSettings() {
        SecuritySettings defaults = SecuritySettings.builder()
                .id(SINGLETON_ID)
                .maxPasswordAttempts(5)
                .sessionTimeoutMinutes(30)
                .minPasswordLength(8)
                .requireUppercase(true)
                .requireNumbers(true)
                .requireSpecialCharacters(false)
                .requireTwoFactor(false)
                .build();
        return securitySettingsRepository.save(defaults);
    }

    private void validateSettings(SecuritySettings settings) {
        if (settings.getMaxPasswordAttempts() == null || settings.getMaxPasswordAttempts() < 1) {
            throw new IllegalArgumentException("Max password attempts must be at least 1");
        }
        if (settings.getSessionTimeoutMinutes() == null || settings.getSessionTimeoutMinutes() < 1) {
            throw new IllegalArgumentException("Session timeout must be at least 1 minute");
        }
        if (settings.getMinPasswordLength() == null || settings.getMinPasswordLength() < 4) {
            throw new IllegalArgumentException("Minimum password length must be at least 4");
        }
    }
}
