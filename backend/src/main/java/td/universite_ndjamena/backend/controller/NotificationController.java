package td.universite_ndjamena.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import td.universite_ndjamena.backend.annotation.Auditable;
import td.universite_ndjamena.backend.config.JwtAuthFilter;
import td.universite_ndjamena.backend.model.Notification;
import td.universite_ndjamena.backend.model.NotificationConfig;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.service.NotificationService;

import java.util.List;
import java.util.Map;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/admin/flow")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Map<String, Object>>> getAdminFlow(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(notificationService.getAdminNotificationFlow(search, pageable));
    }

    @PatchMapping("/admin/users/{userId}/push")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "UPDATE", entity = "NOTIFICATION_SETTINGS", idParam = "userId")
    public ResponseEntity<Map<String, Object>> updatePushPreference(
            @PathVariable Long userId,
            @RequestBody Map<String, Boolean> request) {
        boolean enabled = Boolean.TRUE.equals(request.get("enabled"));
        Users user = notificationService.updatePushPreference(userId, enabled);
        return ResponseEntity.ok(Map.of(
                "userId", user.getId(),
                "pushEnabled", Boolean.TRUE.equals(user.getPushNotificationsEnabled())
        ));
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "CREATE", entity = "NOTIFICATION")
    public ResponseEntity<Notification> createNotification(
            @RequestBody NotificationService.CreateNotificationRequest request,
            Authentication authentication) {
        Long createdById = extractUserId(authentication);
        Notification created = notificationService.createNotification(
                request.recipientId(),
                createdById,
                request.title(),
                request.message(),
                request.priority(),
                request.eventType()
        );
        return ResponseEntity.ok(created);
    }

    @GetMapping("/me")
    public ResponseEntity<List<Map<String, Object>>> getMyNotifications(Authentication authentication) {
        Long userId = extractUserId(authentication);
        return ResponseEntity.ok(notificationService.getMyNotificationFeed(userId));
    }

    @PatchMapping("/{notificationId}/read")
    @Auditable(action = "UPDATE", entity = "NOTIFICATION", idParam = "notificationId")
    public ResponseEntity<Notification> markRead(
            @PathVariable Long notificationId,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, userId));
    }

    @GetMapping("/admin/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NotificationConfig>> getConfigs() {
        return ResponseEntity.ok(notificationService.getConfigs());
    }

    @PatchMapping("/admin/config/{configId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "UPDATE", entity = "NOTIFICATION_CONFIG", idParam = "configId")
    public ResponseEntity<NotificationConfig> updateConfig(
            @PathVariable Long configId,
            @RequestBody Map<String, Boolean> request) {
        return ResponseEntity.ok(notificationService.updateConfig(
                configId,
                request.get("enabled"),
                request.get("adminOnly")
        ));
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtAuthFilter.AuthPrincipal principal)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Unauthorized");
        }
        return principal.id();
    }
}
