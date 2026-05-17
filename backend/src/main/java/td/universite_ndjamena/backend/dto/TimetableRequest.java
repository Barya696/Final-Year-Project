package td.universite_ndjamena.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Create/update payload: times as "HH:mm", day as ISO name e.g. MONDAY.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimetableRequest {
    private String semester;
    /** e.g. MONDAY, TUESDAY (see {@link java.time.DayOfWeek}) */
    private String dayOfWeek;
    private Long courseId;
    private Long roomId;
    /** Optional; omit or null if not assigned yet */
    private Long lecturerId;
    private String startTime;
    private String endTime;
    private String groupCode;
}
