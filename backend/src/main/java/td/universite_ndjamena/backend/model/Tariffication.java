package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "tariffications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tariffication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "compilation_id", nullable = false, unique = true)
    private Long compilationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tariffication_status", nullable = false)
    private TarifficationStatus tarifficationStatus;

    @Column(name = "tariffied_at")
    private LocalDateTime tariffiedAt;

    @Column(name = "sm1_extra_cost")
    private Double sm1ExtraCost;

    @Column(name = "sm2_extra_cost")
    private Double sm2ExtraCost;

    @Column(name = "total_extra_cost")
    private Double totalExtraCost;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (tariffiedAt == null && tarifficationStatus == TarifficationStatus.TARIFFIED) {
            tariffiedAt = LocalDateTime.now();
        }
    }

    public enum TarifficationStatus {
        PENDING,
        TARIFFIED
    }
}