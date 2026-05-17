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
@Table(name = "configuration")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Configuration {

    @Id
    private Long id;

    @Column(nullable = false)
    private String republicName;

    @Column(nullable = false)
    private String universityName;

    @Column(nullable = false)
    private String facultyName;

    @Column(nullable = false)
    private String departmentName;

    @Column(nullable = false)
    private String documentTitle;

    @Column(nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private String referencePrefix;

    @Column(nullable = false)
    private String lecturerLabel;

    @Column(nullable = false)
    private String departmentLabel;

    @Column(nullable = false)
    private String gradeLabel;

    @Column(nullable = false)
    private String groupsLabel;

    @Column(nullable = false)
    private String numberOfCoursesLabel;

    @Column(nullable = false)
    private String referenceNumberLabel;

    @Column(nullable = false)
    private Integer semesterOneCmHours;

    @Column(nullable = false)
    private Integer semesterOneTdHours;

    @Column(nullable = false)
    private Integer semesterOneTpHours;

    @Column(nullable = false)
    private Integer semesterTwoCmHours;

    @Column(nullable = false)
    private Integer semesterTwoTdHours;

    @Column(nullable = false)
    private Integer semesterTwoTpHours;

    @Column(nullable = false)
    private Integer cmRate;

    @Column(nullable = false)
    private Integer tdRate;

    @Column(nullable = false)
    private Integer tpRate;

    @Column(nullable = false)
    private String financialSummaryTitle;

    @Column(nullable = false)
    private String referenceLabel;

    @Column(nullable = false)
    private String dateLabel;

    @Column(nullable = false)
    private String sectionIdentificationTitle;

    @Column(nullable = false)
    private String sectionHoursDetailTitle;

    @Column(nullable = false)
    private String typeLabel;

    @Column(nullable = false)
    private String semesterOneLabel;

    @Column(nullable = false)
    private String semesterTwoLabel;

    @Column(nullable = false)
    private String extraHoursLabel;

    @Column(nullable = false)
    private String totalsLabel;

    @Column(nullable = false)
    private String combinedTotalLabel;

    @Column(nullable = false)
    private String sectionFinancialTitle;

    @Column(nullable = false)
    private String estimatedCostLabel;

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
