package td.universite_ndjamena.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import td.universite_ndjamena.backend.model.AuditLog;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByPerformedBy(String performedBy, Pageable pageable);

    Page<AuditLog> findByEntityName(String entityName, Pageable pageable);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    Page<AuditLog> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to, Pageable pageable);

    Page<AuditLog> findByStatus(AuditLog.AuditStatus status, Pageable pageable);

    @Query("""
            SELECT al FROM AuditLog al
            WHERE (:action IS NULL OR al.action = :action)
            AND (:entityName IS NULL OR al.entityName = :entityName)
            AND (:performedBy IS NULL OR al.performedBy = :performedBy)
            AND (:status IS NULL OR al.status = :status)
            AND (al.createdAt >= COALESCE(:dateFrom, al.createdAt))
            AND (al.createdAt <= COALESCE(:dateTo, al.createdAt))
            AND (FALSE = :excludeRead OR UPPER(al.action) <> 'READ')
            ORDER BY al.createdAt DESC
            """)
    Page<AuditLog> findByFilters(
            @Param("action") String action,
            @Param("entityName") String entityName,
            @Param("performedBy") String performedBy,
            @Param("status") AuditLog.AuditStatus status,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            @Param("excludeRead") boolean excludeRead,
            Pageable pageable
    );

    List<AuditLog> findByEntityIdAndEntityName(String entityId, String entityName);
}
