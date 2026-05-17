package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Classification;
import td.universite_ndjamena.backend.dto.ClassificationRequest;
import td.universite_ndjamena.backend.service.ClassificationService;
import td.universite_ndjamena.backend.security.DepartmentScopeAuth;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/classifications")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class ClassificationController {

    @Autowired
    private ClassificationService classificationService;

    @GetMapping
    public ResponseEntity<List<Classification>> getAllClassifications(
            Authentication authentication,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getAllClassifications(rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Classification> getClassificationById(Authentication authentication, @PathVariable Long id) {
        Optional<Classification> classification = classificationService.getClassificationById(id);
        if (classification.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Long deptId = classification.get().getDepartmentIdValue();
        if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, deptId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(classification.get());
    }

    @GetMapping("/lecturer/{lecturerId}/semester/{semester}")
    public ResponseEntity<List<Classification>> getClassificationsByLecturerAndSemester(
            Authentication authentication,
            @PathVariable Long lecturerId,
            @PathVariable String semester,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getClassificationsByLecturerAndSemester(
                lecturerId, semester, rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    @GetMapping("/semester/{semester}")
    public ResponseEntity<List<Classification>> getClassificationsBySemester(
            Authentication authentication,
            @PathVariable String semester,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getClassificationsBySemester(
                semester, rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Classification>> getClassificationsByStatus(
            Authentication authentication,
            @PathVariable String status,
            @RequestParam(required = false) Long departmentId) {
        try {
            Classification.ClassificationStatus classificationStatus = Classification.ClassificationStatus.valueOf(status.toUpperCase());
            DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
            if (rs.hodWithoutDepartment()) {
                return ResponseEntity.ok(List.of());
            }
            List<Classification> classifications = classificationService.getClassificationsByStatus(
                    classificationStatus, rs.departmentIdFilter());
            return ResponseEntity.ok(classifications);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/lecturer/{lecturerId}")
    public ResponseEntity<List<Classification>> getClassificationsByLecturerId(
            Authentication authentication,
            @PathVariable Long lecturerId,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getClassificationsByLecturerId(
                lecturerId, rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<Classification>> getClassificationsByCourseId(
            Authentication authentication,
            @PathVariable Long courseId,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getClassificationsByCourseId(
                courseId, rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Classification>> getClassificationsByGroupId(
            Authentication authentication,
            @PathVariable Long groupId,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getClassificationsByGroupId(
                groupId, rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    @GetMapping("/department/{departmentId}")
    public ResponseEntity<List<Classification>> getClassificationsByDepartmentId(
            Authentication authentication,
            @PathVariable Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Classification> classifications = classificationService.getClassificationsByDepartmentId(
                rs.departmentIdFilter());
        return ResponseEntity.ok(classifications);
    }

    /**
     * POST /api/classifications/request
     * Body: { "lecturerId": number, "semester": "1" | "2" }
     * Sends an in-app notification to the department HOD.
     */
    @PostMapping("/request")
    public ResponseEntity<?> requestMissingSemester(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        Long requesterId = DepartmentScopeAuth.requirePrincipal(authentication).id();
        try {
            if (body.get("lecturerId") == null || body.get("semester") == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "lecturerId and semester are required"));
            }
            Long lecturerId = Long.valueOf(body.get("lecturerId").toString());
            String semester = body.get("semester").toString().trim();
            int count = classificationService.notifyHodMissingSemester(lecturerId, semester, requesterId);
            return ResponseEntity.ok(Map.of("ok", true, "hodNotifiedCount", count));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createClassification(Authentication authentication, @RequestBody ClassificationRequest req) {
        try {
            if (req.getLecturerId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Lecturer ID is required"));
            }
            if (req.getSemester() == null || req.getSemester().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Semester is required"));
            }

            Long departmentToSave = DepartmentScopeAuth.resolveDepartmentForCreate(authentication, req.getDepartmentId());

            String courseIds = req.getCourseIds() != null && !req.getCourseIds().isBlank() ? req.getCourseIds()
                    : (req.getCourseId() != null ? req.getCourseId().toString() : null);
            String groupIds = req.getGroupIds() != null && !req.getGroupIds().isBlank() ? req.getGroupIds()
                    : (req.getGroupId() != null ? req.getGroupId().toString() : null);

            if (courseIds == null || courseIds.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required"));
            }
            if (groupIds == null || groupIds.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Group ID is required"));
            }

            Classification classification = new Classification();
            classification.setSemester(req.getSemester());
            classification.setCourseIds(courseIds);
            classification.setGroupIds(groupIds);

            int cmTotalMinutes = (req.getCmHour() != null ? req.getCmHour() : 0) * 60 + (req.getCmMinute() != null ? req.getCmMinute() : 0);
            int tdTotalMinutes = (req.getTdHour() != null ? req.getTdHour() : 0) * 60 + (req.getTdMinute() != null ? req.getTdMinute() : 0);
            int tpTotalMinutes = (req.getTpHour() != null ? req.getTpHour() : 0) * 60 + (req.getTpMinute() != null ? req.getTpMinute() : 0);

            classification.setCmHour(cmTotalMinutes);
            classification.setTdHour(tdTotalMinutes);
            classification.setTpHour(tpTotalMinutes);
            classification.setClassifiedStatus(Classification.ClassificationStatus.PENDING);

            String sessionIds = req.getSessionIds();

            Classification createdClassification = classificationService.createClassification(
                    classification,
                    req.getLecturerId(),
                    courseIds,
                    groupIds,
                    departmentToSave,
                    sessionIds
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(createdClassification);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClassification(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody Classification classificationDetails) {
        try {
            Optional<Classification> existing = classificationService.getClassificationById(id);
            if (existing.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, existing.get().getDepartmentIdValue())) {
                return ResponseEntity.notFound().build();
            }
            Classification updatedClassification = classificationService.updateClassification(id, classificationDetails);
            return ResponseEntity.ok(updatedClassification);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClassification(Authentication authentication, @PathVariable Long id) {
        try {
            Optional<Classification> existing = classificationService.getClassificationById(id);
            if (existing.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, existing.get().getDepartmentIdValue())) {
                return ResponseEntity.notFound().build();
            }
            classificationService.deleteClassification(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/recalculate")
    public ResponseEntity<?> recalculateClassificationHours(Authentication authentication, @PathVariable Long id) {
        try {
            Optional<Classification> existing = classificationService.getClassificationById(id);
            if (existing.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Classification not found"));
            }
            if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, existing.get().getDepartmentIdValue())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Classification not found"));
            }
            Classification recalculatedClassification = classificationService.recalculateHoursFromSessions(id);
            return ResponseEntity.ok(recalculatedClassification);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
