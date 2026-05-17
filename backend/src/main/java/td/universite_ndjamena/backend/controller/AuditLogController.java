package td.universite_ndjamena.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import td.universite_ndjamena.backend.dto.AuditFilterDTO;
import td.universite_ndjamena.backend.dto.AuditLogDTO;
import td.universite_ndjamena.backend.model.AuditLog;
import td.universite_ndjamena.backend.service.AuditLogService;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * Get paginated audit logs with filters
     */
    @GetMapping
    public ResponseEntity<Page<AuditLogDTO>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String performedBy,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false, defaultValue = "true") boolean excludeRead
    ) {
        log.info("Fetching audit logs: page={}, size={}", page, size);

        // Parse sort parameter
        Sort.Order order = new Sort.Order(Sort.Direction.DESC, "createdAt");
        if (sort != null && !sort.isEmpty()) {
            String[] sortParts = sort.split(",");
            Sort.Direction direction = sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1])
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
            order = new Sort.Order(direction, sortParts[0]);
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(order));

        // Build filter
        AuditFilterDTO filter = AuditFilterDTO.builder()
                .action(action)
                .entityName(entityName)
                .performedBy(performedBy)
                .status(status != null ? AuditLog.AuditStatus.valueOf(status) : null)
                .dateFrom(dateFrom != null ? LocalDateTime.parse(dateFrom) : null)
                .dateTo(dateTo != null ? LocalDateTime.parse(dateTo) : null)
                .excludeRead(excludeRead)
                .build();

        Page<AuditLogDTO> logs = auditLogService.getAuditLogs(filter, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * Get single audit log detail
     */
    @GetMapping("/{id}")
    public ResponseEntity<AuditLogDTO> getAuditLogDetail(@PathVariable Long id) {
        log.info("Fetching audit log with id: {}", id);
        AuditLogDTO auditLog = auditLogService.getAuditLogById(id);
        return ResponseEntity.ok(auditLog);
    }

    /**
     * Get audit statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAuditStats(
            @RequestParam(required = false, defaultValue = "true") boolean excludeRead
    ) {
        log.info("Fetching audit statistics");
        Map<String, Object> stats = auditLogService.getAuditStats(excludeRead);
        return ResponseEntity.ok(stats);
    }

    /**
     * Export audit logs as CSV
     */
    @GetMapping("/export")
    public ResponseEntity<String> exportAsCsv(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String performedBy,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false, defaultValue = "true") boolean excludeRead
    ) throws IOException {
        log.info("Exporting audit logs as CSV");

        AuditFilterDTO filter = AuditFilterDTO.builder()
                .action(action)
                .entityName(entityName)
                .performedBy(performedBy)
                .status(status != null ? AuditLog.AuditStatus.valueOf(status) : null)
                .dateFrom(dateFrom != null ? LocalDateTime.parse(dateFrom) : null)
                .dateTo(dateTo != null ? LocalDateTime.parse(dateTo) : null)
                .excludeRead(excludeRead)
                .build();

        String csv = auditLogService.exportAsCsv(filter);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-logs.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    /**
     * Get audit history for specific entity
     */
    @GetMapping("/entity/{entityName}/{entityId}")
    public ResponseEntity<java.util.List<AuditLogDTO>> getEntityAuditHistory(
            @PathVariable String entityName,
            @PathVariable String entityId
    ) {
        log.info("Fetching audit history for entity: {} with id: {}", entityName, entityId);
        java.util.List<AuditLogDTO> history = auditLogService.getEntityAuditHistory(entityName, entityId);
        return ResponseEntity.ok(history);
    }
}
