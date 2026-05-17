package td.universite_ndjamena.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LecturerRequest {
    private String lecturerName;
    private String grade;
    private String department;
}
