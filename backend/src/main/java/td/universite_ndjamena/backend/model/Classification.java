package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "classification")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private Lecturer lecturer;

    @Transient
    @JsonProperty("lecturerId")
    private Long lecturerId;

    @PostLoad
    private void populateTransientIds() {
        if (lecturer != null)   this.lecturerId   = lecturer.getId();
        if (department != null) this.departmentId = department.getId();
    }

    public void setLecturerId(Long id) { this.lecturerId = id; }

    @JsonProperty("lecturerName")
    public String getLecturerName() {
        return lecturer != null ? lecturer.getLecturerName() : null;
    }

    @NotNull(message = "Semester is required")
    @Column(name = "semester", nullable = false)
    private String semester;

    @Column(name = "course_ids", nullable = false)
    @JsonProperty("courseIds")
    private String courseIds;

    @Column(name = "group_ids", nullable = false)
    @JsonProperty("groupIds")
    private String groupIds;

    @Column(name = "session_ids")
    @JsonProperty("sessionIds")
    private String sessionIds;

    /**
     * Same FK as {@code users.department_id} for the HOD who owns this row (and the same {@code departments.id}
     * used on {@code session.department_id}). Non-HOD callers supply the id in the API when creating.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id", nullable = false, referencedColumnName = "id")
    private Department department;

    @Transient
    @JsonProperty("departmentId")
    private Long departmentId;

    public void setDepartmentId(Long id) { this.departmentId = id; }

    @JsonProperty("departmentName")
    public String getDepartmentName() {
        return department != null ? department.getDepartmentName() : null;
    }

    // No @JsonProperty — used only internally by CompilationService
    public Long getDepartmentIdValue() {
        return department != null ? department.getId() : null;
    }

    @Column(name = "cm_hour", nullable = false)
    @JsonProperty("cmHour")
    @Builder.Default private Integer cmHour = 0;

    @Column(name = "td_hour", nullable = false)
    @JsonProperty("tdHour")
    @Builder.Default private Integer tdHour = 0;

    @Column(name = "tp_hour", nullable = false)
    @JsonProperty("tpHour")
    @Builder.Default private Integer tpHour = 0;

    @Column(name = "core_cm", nullable = false)
    @JsonProperty("coreCm")
    @Builder.Default private Integer coreCm = 0;

    @Column(name = "core_td", nullable = false)
    @JsonProperty("coreTd")
    @Builder.Default private Integer coreTd = 0;

    @Column(name = "core_tp", nullable = false)
    @JsonProperty("coreTp")
    @Builder.Default private Integer coreTp = 0;

    @Column(name = "elective_cm", nullable = false)
    @JsonProperty("electiveCm")
    @Builder.Default private Integer electiveCm = 0;

    @Column(name = "elective_td", nullable = false)
    @JsonProperty("electiveTd")
    @Builder.Default private Integer electiveTd = 0;

    @Column(name = "elective_tp", nullable = false)
    @JsonProperty("electiveTp")
    @Builder.Default private Integer electiveTp = 0;

    @Column(name = "classified_status", nullable = false)
    @Enumerated(EnumType.STRING)
    @JsonProperty("classifiedStatus")
    @Builder.Default private ClassificationStatus classifiedStatus = ClassificationStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ClassificationStatus {
        PENDING,
        VALIDATED,
        RETURNED
    }
}