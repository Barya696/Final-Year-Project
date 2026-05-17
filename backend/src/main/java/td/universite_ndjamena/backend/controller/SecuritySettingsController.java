package td.universite_ndjamena.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import td.universite_ndjamena.backend.model.SecuritySettings;
import td.universite_ndjamena.backend.service.SecuritySettingsService;

import java.util.Map;

@RestController
@RequestMapping("/api/security-settings")
@RequiredArgsConstructor
public class SecuritySettingsController {

    private final SecuritySettingsService securitySettingsService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SecuritySettings> getSettings() {
        return ResponseEntity.ok(securitySettingsService.getSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSettings(@RequestBody SecuritySettings settings) {
        try {
            return ResponseEntity.ok(securitySettingsService.updateSettings(settings));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
