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
public class AuditLogDTO {
    private Long id;
    private String action;
    private String entityName;
    private String entityId;
    private String performedBy;
    private String ipAddress;
    private String userAgent;
    private String oldValue;
    private String newValue;
    private AuditLog.AuditStatus status;
    private LocalDateTime createdAt;
}
