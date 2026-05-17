package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "compilations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Compilation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lecturer_id", nullable = false)
    private Long lecturerId;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    // Semester 1 — raw
    @Column(name = "s1_core_cm", nullable = false) @Builder.Default private Integer s1CoreCm = 0;
    @Column(name = "s1_core_td", nullable = false) @Builder.Default private Integer s1CoreTd = 0;
    @Column(name = "s1_core_tp", nullable = false) @Builder.Default private Integer s1CoreTp = 0;
    @Column(name = "s1_elective_cm", nullable = false) @Builder.Default private Integer s1ElectiveCm = 0;
    @Column(name = "s1_elective_td", nullable = false) @Builder.Default private Integer s1ElectiveTd = 0;
    @Column(name = "s1_elective_tp", nullable = false) @Builder.Default private Integer s1ElectiveTp = 0;

    // Semester 1 — computed
    @Column(name = "s1_weighted_total", nullable = false) private Integer s1WeightedTotal;
    @Column(name = "s1_required", nullable = false) @Builder.Default private Integer s1Required = 300;
    @Column(name = "s1_extra", nullable = false) private Integer s1Extra;

    // Semester 2 — raw
    @Column(name = "s2_core_cm", nullable = false) @Builder.Default private Integer s2CoreCm = 0;
    @Column(name = "s2_core_td", nullable = false) @Builder.Default private Integer s2CoreTd = 0;
    @Column(name = "s2_core_tp", nullable = false) @Builder.Default private Integer s2CoreTp = 0;
    @Column(name = "s2_elective_cm", nullable = false) @Builder.Default private Integer s2ElectiveCm = 0;
    @Column(name = "s2_elective_td", nullable = false) @Builder.Default private Integer s2ElectiveTd = 0;
    @Column(name = "s2_elective_tp", nullable = false) @Builder.Default private Integer s2ElectiveTp = 0;

    // Semester 2 — computed
    @Column(name = "s2_weighted_total", nullable = false) private Integer s2WeightedTotal;
    @Column(name = "s2_required", nullable = false) @Builder.Default private Integer s2Required = 300;
    @Column(name = "s2_extra", nullable = false) private Integer s2Extra;

    // Combined
    @Column(name = "combined_total", nullable = false) private Integer combinedTotal;
    @Column(name = "combined_extra", nullable = false) private Integer combinedExtra;

    // ── NEW: tariffication status ──────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "tariffication_status", nullable = false)
    @Builder.Default
    private TarifficationStatus tarifficationStatus = TarifficationStatus.PENDING;

    public enum TarifficationStatus {
        PENDING,
        TARIFFIED
    }

    // Metadata
    @Column(name = "compiled_at", nullable = false, updatable = false)
    private LocalDateTime compiledAt;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @PrePersist
    protected void onCreate() {
        compiledAt = LocalDateTime.now();
        int year = compiledAt.getMonthValue() >= 8
                ? compiledAt.getYear()
                : compiledAt.getYear() - 1;
        academicYear = year + "/" + (year + 1);
    }
}