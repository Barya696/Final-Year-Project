package td.universite_ndjamena.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Teaching assignment (who teaches what, when) stored in the {@code schedule} table.
 * Links to {@link Course} and {@link Lecturer}.
 */
@Entity
@Table(name = "schedule")
@Data
@EqualsAndHashCode(of = {"id"})
@ToString(exclude = {"course", "lecturer", "timetable"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeachingAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "assignment_date", nullable = false)
    @JsonProperty("assignmentDate")
    private LocalDate assignmentDate;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "timetable_id")
    private Timetable timetable;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private Lecturer lecturer;

    @NotBlank
    @Column(nullable = false)
    private String semester;

    /** Stored as {@code UEF} or {@code UT} (matches UI). */
    @NotBlank
    @Column(name = "assignment_type", nullable = false, length = 8)
    @JsonProperty("assignmentType")
    private String assignmentType;

    @NotNull
    @Positive
    @Column(name = "teaching_hours", nullable = false)
    @JsonProperty("teachingHours")
    private Integer teachingHours;

    @Column(name = "group_code")
    @JsonProperty("groupCode")
    private String groupCode;

    @NotNull
    @Positive
    @Column(name = "chapter_count", nullable = false)
    @JsonProperty("chapterCount")
    private Integer chapterCount;

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
}
