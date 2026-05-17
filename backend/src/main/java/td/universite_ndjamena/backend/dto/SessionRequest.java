package td.universite_ndjamena.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionRequest {
    /** Required for non-HOD callers; ignored for HOD (server uses the signed-in HOD user's department). */
    private Long departmentId;
    private Long lecturerId;
    private Long courseId;
    private String semester;
    private String startTime;
    private String endTime;
    private String groupCode;
    private String sessionType;
    private Integer chapters;
    private String sessionDate;
}
