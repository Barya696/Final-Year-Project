package td.universite_ndjamena.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Scheduled course occurrence: one course in a room on a weekday within a semester (recurring weekly slot).
 */
@Entity
@Table(name = "timetables")
@Data
@EqualsAndHashCode(of = {"id"})
@ToString(exclude = {"course", "room", "lecturer"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Semester is required")
    @Column(nullable = false)
    @JsonProperty("semester")
    private String semester;

    @NotNull(message = "Day of week is required")
    /** Persisted as plain text ({@code varchar}) for PostgreSQL portability. */
    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false, columnDefinition = "varchar(16)")
    @JsonProperty("dayOfWeek")
    private DayOfWeek dayOfWeek;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lecturer_id")
    private Lecturer lecturer;

    @NotNull
    @Column(name = "start_time", nullable = false)
    @JsonProperty("startTime")
    private LocalTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    @JsonProperty("endTime")
    private LocalTime endTime;

    @Column(name = "group_code")
    @JsonProperty("groupCode")
    private String groupCode;

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
