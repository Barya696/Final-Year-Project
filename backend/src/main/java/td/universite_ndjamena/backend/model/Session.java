package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "session")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private Lecturer lecturer;

    @Transient
    private Long lecturerId;

    public void setLecturerId(Long id) {
        this.lecturerId = id;
    }

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    /**
     * Same department as {@code users.department_id} for the HOD who creates or owns this data scope:
     * FK to {@code departments.id} (the same id stored on the HOD user row). Other roles use
     * {@code department_id} from the API body when creating sessions. Nullable for legacy rows.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", referencedColumnName = "id")
    @JsonIgnore
    private Department hodDepartment;

    @Transient
    private Long courseId;

    public void setCourseId(Long id) {
        this.courseId = id;
    }

    @JsonProperty("courseName")
    public String getCourseName() {
        return course != null ? course.getCourseName() : null;
    }

    @JsonProperty("courseCode")
    public String getCourseCode() {
        return course != null ? course.getCode() : null;
    }

    @NotBlank(message = "Semester is required")
    @Column(name = "semester", nullable = false)
    @JsonProperty("semester")
    private String semester;

    @JsonProperty("lecturer_name")
    public String getLecturerName() {
        return lecturer != null ? lecturer.getLecturerName() : null;
    }

    @Column(name = "start_time", nullable = false)
    @JsonProperty("startTime")
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    @JsonProperty("endTime")
    private LocalTime endTime;

    @Transient
    @JsonProperty("session_hours")
    private Integer sessionHours;

    @JsonProperty("grade")
    public String getGrade() {
        return lecturer != null ? lecturer.getGrade() : null;
    }

    @JsonProperty("department")
    public String getDepartment() {
        return lecturer != null ? lecturer.getDepartment() : null;
    }

    @JsonProperty("departmentId")
    public Long getDepartmentId() {
        return hodDepartment != null ? hodDepartment.getId() : null;
    }

    @NotBlank(message = "Group code is required")
    @Column(name = "group_code", nullable = false)
    @JsonProperty("groupCode")
    private String groupCode;

    @NotBlank(message = "Session type is required")
    @Column(name = "session_type", nullable = false)
    @JsonProperty("sessionType")
    private String sessionType;

    @Positive(message = "Chapters must be positive")
    @Column(nullable = false)
    @JsonProperty("chapters")
    private Integer chapters;

    @Column(name = "session_date", nullable = false)
    @JsonProperty("sessionDate")
    private LocalDate sessionDate;

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

    /**
     * Returns the duration of this session in MINUTES (end_time - start_time).
     * For example: 08:00 -> 09:30 = 90 minutes.
     */
    public Integer getSessionMinutes() {
        if (startTime != null && endTime != null) {
            return (int) ChronoUnit.MINUTES.between(startTime, endTime);
        }
        return 0;
    }

    /**
     * @deprecated Use {@link #getSessionMinutes()} instead.
     * This kept for backward compatibility — it still returns whole hours (truncated).
     */
    @Deprecated
    public Integer getSessionHours() {
        if (startTime != null && endTime != null) {
            return (int) ChronoUnit.HOURS.between(startTime, endTime);
        }
        return 0;
    }
}
