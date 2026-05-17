package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "archive",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_archive_tariffication_id", columnNames = {"tariffication_id"})
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Archive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tariffication_id", nullable = false)
    private Long tarifficationId;

    @Column(name = "archived", nullable = false)
    private Boolean archived;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "unarchived_at")
    private LocalDateTime unarchivedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (archived == null) {
            archived = Boolean.TRUE;
        }
        if (Boolean.TRUE.equals(archived) && archivedAt == null) {
            archivedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
