package td.universite_ndjamena.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClassificationRequest {
    private Long lecturerId;
    private String semester;
    private String courseIds;      // "1,2" - new comma-separated format
    private String groupIds;       // "1" or "1,2" - new comma-separated format
    private String sessionIds;     // "1,2,3" - new comma-separated format (optional)
    private Long departmentId;
    
    // Support both separate hours/minutes and combined totals
    private Integer cmHour;        // hours component
    private Integer cmMinute;      // minutes component (0-59)
    private Integer tdHour;        // hours component
    private Integer tdMinute;      // minutes component (0-59)
    private Integer tpHour;        // hours component
    private Integer tpMinute;      // minutes component (0-59)

    // Legacy single ID fields for backward compatibility
    private Long courseId;
    private Long groupId;
}
