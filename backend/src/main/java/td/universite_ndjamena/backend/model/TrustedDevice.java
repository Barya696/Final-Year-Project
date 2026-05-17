package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "trusted_devices",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "device_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrustedDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "device_id", nullable = false, length = 128)
    private String deviceId;

    @Column(name = "trusted_at", nullable = false)
    private LocalDateTime trustedAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
}
