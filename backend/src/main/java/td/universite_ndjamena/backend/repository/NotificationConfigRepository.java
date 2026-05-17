package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import td.universite_ndjamena.backend.model.Notification;
import td.universite_ndjamena.backend.model.NotificationConfig;

import java.util.Optional;

@Repository
public interface NotificationConfigRepository extends JpaRepository<NotificationConfig, Long> {
    Optional<NotificationConfig> findByEventType(Notification.NotificationEventType eventType);
}
