package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.model.Notification;
import td.universite_ndjamena.backend.model.NotificationConfig;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.repository.NotificationConfigRepository;
import td.universite_ndjamena.backend.repository.NotificationRepository;
import td.universite_ndjamena.backend.repository.UsersRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.AbstractMap;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationConfigRepository notificationConfigRepository;
    private final UsersRepository usersRepository;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAdminNotificationFlow(String search, Pageable pageable) {
        List<Users> users = usersRepository.findAll().stream()
                .filter(user -> user.getStatus() == Users.UserStatus.ACTIVE)
                .filter(user -> matchesSearch(user, search))
                .toList();

        int total = users.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), total);
        List<Users> pagedUsers = start > total ? List.of() : users.subList(start, end);

        List<Map<String, Object>> content = pagedUsers.stream()
                .map(this::toFlowRow)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, total);
    }

    @Transactional(readOnly = true)
    public List<Notification> getMyNotifications(Long userId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyNotificationFeed(Long userId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toFeedRow)
                .collect(Collectors.toList());
    }

    public List<NotificationConfig> getConfigs() {
        ensureDefaultConfigs();
        return notificationConfigRepository.findAll().stream()
                .sorted(Comparator.comparing(NotificationConfig::getEventType))
                .toList();
    }

    public NotificationConfig updateConfig(Long configId, Boolean enabled, Boolean adminOnly) {
        NotificationConfig config = notificationConfigRepository.findById(configId)
                .orElseThrow(() -> new IllegalArgumentException("Notification config not found with id: " + configId));
        if (enabled != null) {
            config.setEnabled(enabled);
        }
        if (adminOnly != null) {
            config.setAdminOnly(adminOnly);
        }
        return notificationConfigRepository.save(config);
    }

    public void notifyAdmins(Notification.NotificationEventType eventType, String title, String message,
                             Notification.NotificationPriority priority) {
        NotificationConfig config = getOrCreateConfig(eventType);
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            return;
        }
        List<Users> admins = usersRepository.findByRole(Users.UserRole.ADMIN);
        for (Users admin : admins) {
            Notification notification = Notification.builder()
                    .recipient(admin)
                    .title(title)
                    .message(message)
                    .priority(priority == null ? Notification.NotificationPriority.MEDIUM : priority)
                    .eventType(eventType)
                    .status(Notification.NotificationStatus.UNREAD)
                    .build();
            notificationRepository.save(notification);
        }
    }

    public Notification createNotification(Long recipientId, Long createdById, String title, String message,
                                           Notification.NotificationPriority priority,
                                           Notification.NotificationEventType eventType) {
        Users recipient = usersRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with id: " + recipientId));

        Users createdBy = null;
        if (createdById != null) {
            createdBy = usersRepository.findById(createdById)
                    .orElseThrow(() -> new IllegalArgumentException("Creator not found with id: " + createdById));
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .createdBy(createdBy)
                .title(title)
                .message(message)
                .priority(priority == null ? Notification.NotificationPriority.MEDIUM : priority)
                .eventType(eventType == null ? Notification.NotificationEventType.CUSTOM : eventType)
                .status(Notification.NotificationStatus.UNREAD)
                .build();

        return notificationRepository.save(notification);
    }

    public Notification markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with id: " + notificationId));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only mark your own notifications as read");
        }

        notification.setStatus(Notification.NotificationStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    private Map<String, Object> toFeedRow(Notification notification) {
        // Map.of / Map.ofEntries reject null values; notification rows can contain null readAt.
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", notification.getId());
        row.put("title", notification.getTitle() == null ? "" : notification.getTitle());
        row.put("message", notification.getMessage() == null ? "" : notification.getMessage());
        row.put("eventType", notification.getEventType() == null ? Notification.NotificationEventType.CUSTOM.name() : notification.getEventType().name());
        row.put("priority", notification.getPriority() == null ? Notification.NotificationPriority.MEDIUM.name() : notification.getPriority().name());
        row.put("status", notification.getStatus() == null ? Notification.NotificationStatus.UNREAD.name() : notification.getStatus().name());
        row.put("createdAt", notification.getCreatedAt());
        row.put("readAt", notification.getReadAt());
        return row;
    }

    public Users updatePushPreference(Long userId, boolean enabled) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        user.setPushNotificationsEnabled(enabled);
        return usersRepository.save(user);
    }

    private boolean matchesSearch(Users user, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String q = search.toLowerCase(Locale.ROOT);
        String name = user.getName() == null ? "" : user.getName().toLowerCase(Locale.ROOT);
        String email = user.getEmail() == null ? "" : user.getEmail().toLowerCase(Locale.ROOT);
        return name.contains(q) || email.contains(q);
    }

    private Map<String, Object> toFlowRow(Users user) {
        long total = notificationRepository.countByRecipient_Id(user.getId());
        long read = notificationRepository.countByRecipient_IdAndStatus(user.getId(), Notification.NotificationStatus.READ);
        long unread = notificationRepository.countByRecipient_IdAndStatus(user.getId(), Notification.NotificationStatus.UNREAD);
        long high = notificationRepository.countByRecipient_IdAndPriority(user.getId(), Notification.NotificationPriority.HIGH);
        long medium = notificationRepository.countByRecipient_IdAndPriority(user.getId(), Notification.NotificationPriority.MEDIUM);
        long low = notificationRepository.countByRecipient_IdAndPriority(user.getId(), Notification.NotificationPriority.LOW);
        String initials = buildInitials(user.getName());
        String department = user.getDepartment() != null ? user.getDepartment().getDepartmentName() : "N/A";

        return Map.ofEntries(
                new AbstractMap.SimpleEntry<>("id", user.getId()),
                new AbstractMap.SimpleEntry<>("name", user.getName() == null ? "" : user.getName()),
                new AbstractMap.SimpleEntry<>("email", user.getEmail() == null ? "" : user.getEmail()),
                new AbstractMap.SimpleEntry<>("initials", initials),
                new AbstractMap.SimpleEntry<>("department", department),
                new AbstractMap.SimpleEntry<>("level", user.getRole().name()),
                new AbstractMap.SimpleEntry<>("total", total),
                new AbstractMap.SimpleEntry<>("read", read),
                new AbstractMap.SimpleEntry<>("unread", unread),
                new AbstractMap.SimpleEntry<>("high", high),
                new AbstractMap.SimpleEntry<>("medium", medium),
                new AbstractMap.SimpleEntry<>("low", low),
                new AbstractMap.SimpleEntry<>("pushEnabled", Boolean.TRUE.equals(user.getPushNotificationsEnabled()))
        );
    }

    private String buildInitials(String name) {
        if (name == null || name.isBlank()) {
            return "?";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase(Locale.ROOT);
        }
        return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase(Locale.ROOT);
    }

    private void ensureDefaultConfigs() {
        for (Notification.NotificationEventType eventType : Notification.NotificationEventType.values()) {
            getOrCreateConfig(eventType);
        }
    }

    private NotificationConfig getOrCreateConfig(Notification.NotificationEventType eventType) {
        return notificationConfigRepository.findByEventType(eventType).orElseGet(() ->
                notificationConfigRepository.save(NotificationConfig.builder()
                        .eventType(eventType)
                        .enabled(true)
                        .adminOnly(isAdminOnlyDefault(eventType))
                        .build())
        );
    }

    private boolean isAdminOnlyDefault(Notification.NotificationEventType eventType) {
        return eventType == Notification.NotificationEventType.LOGIN_FAILED
                || eventType == Notification.NotificationEventType.PASSWORD_CHANGED;
    }

    public record CreateNotificationRequest(Long recipientId, String title, String message,
                                            Notification.NotificationPriority priority,
                                            Notification.NotificationEventType eventType) {}
}
