package td.universite_ndjamena.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import td.universite_ndjamena.backend.model.AuditLog;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditFilterDTO {
    private String action;
    private String entityName;
    private String performedBy;
    private AuditLog.AuditStatus status;
    private LocalDateTime dateFrom;
    private LocalDateTime dateTo;

    /** When true (default via API), list/export queries omit READ-only audit rows */
    @Builder.Default
    private boolean excludeRead = true;
}
