package td.universite_ndjamena.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Create/update body for {@link td.universite_ndjamena.backend.model.TeachingAssignment}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeachingAssignmentRequest {
    /** ISO-8601 date, e.g. {@code 2025-01-15} */
    private String assignmentDate;
    /** Must reference an existing timetable slot. */
    private Long timetableId;
    private Long lecturerId;
    private String semester;
    /** {@code UEF} or {@code UT} */
    private String assignmentType;
    private Integer teachingHours;
    private String groupCode;
    private Integer chapterCount;
}
