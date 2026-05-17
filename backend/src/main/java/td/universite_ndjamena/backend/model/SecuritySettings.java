package td.universite_ndjamena.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "security_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecuritySettings {

    @Id
    private Long id;

    @Column(nullable = false)
    private Integer maxPasswordAttempts;

    @Column(nullable = false)
    private Integer sessionTimeoutMinutes;

    @Column(nullable = false)
    private Integer minPasswordLength;

    @Column(nullable = false)
    private Boolean requireUppercase;

    @Column(nullable = false)
    private Boolean requireNumbers;

    @Column(nullable = false)
    private Boolean requireSpecialCharacters;

    @Column(nullable = false)
    private Boolean requireTwoFactor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
