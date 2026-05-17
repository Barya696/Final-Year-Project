package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import td.universite_ndjamena.backend.model.Notification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipient_IdOrderByCreatedAtDesc(Long recipientId);

    long countByRecipient_Id(Long recipientId);

    long countByRecipient_IdAndStatus(Long recipientId, Notification.NotificationStatus status);

    long countByRecipient_IdAndPriority(Long recipientId, Notification.NotificationPriority priority);
}
