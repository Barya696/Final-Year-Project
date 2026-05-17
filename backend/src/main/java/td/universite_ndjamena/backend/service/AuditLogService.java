package td.universite_ndjamena.backend.service;

import com.opencsv.CSVWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.dto.AuditFilterDTO;
import td.universite_ndjamena.backend.dto.AuditLogDTO;
import td.universite_ndjamena.backend.model.AuditLog;
import td.universite_ndjamena.backend.repository.AuditLogRepository;

import java.io.IOException;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Retrieve paginated audit logs with filters
     */
    public Page<AuditLogDTO> getAuditLogs(AuditFilterDTO filter, Pageable pageable) {
        log.debug("Retrieving audit logs with filter: {}", filter);

        Page<AuditLog> page = auditLogRepository.findByFilters(
                filter.getAction(),
                filter.getEntityName(),
                filter.getPerformedBy(),
                filter.getStatus(),
                filter.getDateFrom(),
                filter.getDateTo(),
                filter.isExcludeRead(),
                pageable
        );

        return page.map(this::convertToDTO);
    }

    /**
     * Get single audit log by ID
     */
    public AuditLogDTO getAuditLogById(Long id) {
        return auditLogRepository.findById(id)
                .map(this::convertToDTO)
                .orElseThrow(() -> new RuntimeException("Audit log not found with id: " + id));
    }

    /**
     * Log an action
     */
    public AuditLogDTO logAction(String action, String entityName, String entityId,
                                  String performedBy, String ipAddress, String userAgent,
                                  String oldValue, String newValue, String status) {
        log.info("Logging action: {} for entity: {} (id: {})", action, entityName, entityId);

        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .entityName(entityName)
                .entityId(entityId)
                .performedBy(performedBy)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .oldValue(oldValue)
                .newValue(newValue)
                .status(AuditLog.AuditStatus.valueOf(status))
                .build();

        AuditLog savedLog = auditLogRepository.save(auditLog);
        return convertToDTO(savedLog);
    }

    /**
     * Get audit statistics
     */
    public Map<String, Object> getAuditStats(boolean excludeRead) {
        List<AuditLog> allLogs = auditLogRepository.findAll();
        if (excludeRead) {
            allLogs = allLogs.stream()
                    .filter(log -> log.getAction() == null || !"READ".equalsIgnoreCase(log.getAction()))
                    .toList();
        }

        Map<String, Long> actionCounts = allLogs.stream()
                .collect(Collectors.groupingBy(AuditLog::getAction, Collectors.counting()));

        Map<String, Long> statusCounts = allLogs.stream()
                .collect(Collectors.groupingBy(al -> al.getStatus().toString(), Collectors.counting()));

        Map<String, Long> entityCounts = allLogs.stream()
                .collect(Collectors.groupingBy(AuditLog::getEntityName, Collectors.counting()));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalLogs", allLogs.size());
        stats.put("actionCounts", actionCounts);
        stats.put("statusCounts", statusCounts);
        stats.put("entityCounts", entityCounts);

        return stats;
    }

    /**
     * Export audit logs as CSV
     */
    public String exportAsCsv(AuditFilterDTO filter) throws IOException {
        Page<AuditLog> page = auditLogRepository.findByFilters(
                filter.getAction(),
                filter.getEntityName(),
                filter.getPerformedBy(),
                filter.getStatus(),
                filter.getDateFrom(),
                filter.getDateTo(),
                filter.isExcludeRead(),
                Pageable.unpaged()
        );

        List<AuditLog> logs = page.getContent();

        StringWriter sw = new StringWriter();
        CSVWriter csvWriter = new CSVWriter(sw);

        // Write header
        String[] header = {"ID", "Action", "Entity Name", "Entity ID", "Performed By",
                "IP Address", "User Agent", "Old Value", "New Value", "Status", "Created At"};
        csvWriter.writeNext(header);

        // Write data
        for (AuditLog log : logs) {
            String[] row = {
                    log.getId().toString(),
                    log.getAction(),
                    log.getEntityName(),
                    log.getEntityId(),
                    log.getPerformedBy(),
                    log.getIpAddress(),
                    log.getUserAgent(),
                    log.getOldValue(),
                    log.getNewValue(),
                    log.getStatus().toString(),
                    log.getCreatedAt().toString()
            };
            csvWriter.writeNext(row);
        }

        csvWriter.close();
        return sw.toString();
    }

    /**
     * Get audit history for a specific entity
     */
    public List<AuditLogDTO> getEntityAuditHistory(String entityName, String entityId) {
        return auditLogRepository.findByEntityIdAndEntityName(entityId, entityName)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Delete old audit logs (retention policy)
     */
    public int deleteOldLogs(LocalDateTime before) {
        List<AuditLog> oldLogs = auditLogRepository.findAll();
        long deletedCount = oldLogs.stream()
                .filter(log -> log.getCreatedAt().isBefore(before))
                .peek(auditLogRepository::delete)
                .count();
        log.info("Deleted {} old audit logs", deletedCount);
        return (int) deletedCount;
    }

    private AuditLogDTO convertToDTO(AuditLog auditLog) {
        return AuditLogDTO.builder()
                .id(auditLog.getId())
                .action(auditLog.getAction())
                .entityName(auditLog.getEntityName())
                .entityId(auditLog.getEntityId())
                .performedBy(auditLog.getPerformedBy())
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
                .oldValue(auditLog.getOldValue())
                .newValue(auditLog.getNewValue())
                .status(auditLog.getStatus())
                .createdAt(auditLog.getCreatedAt())
                .build();
    }
}
