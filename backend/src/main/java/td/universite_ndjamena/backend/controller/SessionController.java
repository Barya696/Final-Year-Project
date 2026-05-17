package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Session;
import td.universite_ndjamena.backend.dto.SessionRequest;
import td.universite_ndjamena.backend.service.SessionService;
import td.universite_ndjamena.backend.security.DepartmentScopeAuth;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.time.LocalTime;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class SessionController {

    @Autowired
    private SessionService sessionService;

    /** JSON rows for Academic session report (session table); optional lecturer + semester filters */
    @GetMapping("/report")
    public ResponseEntity<List<Session>> getReport(
            Authentication authentication,
            @RequestParam(required = false) Long lecturerId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Session> rows = sessionService.getSessionsForReport(lecturerId, semester, rs.departmentIdFilter());
        return ResponseEntity.ok(rows);
    }

    /** UTF-8 CSV export (same filters as GET /report) */
    @GetMapping("/report/export")
    public ResponseEntity<byte[]> exportReport(
            Authentication authentication,
            @RequestParam(required = false) Long lecturerId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"academic-session-report.csv\"")
                    .body(sessionService.buildSessionsReportCsv(List.of()));
        }
        List<Session> rows = sessionService.getSessionsForReport(lecturerId, semester, rs.departmentIdFilter());
        byte[] csv = sessionService.buildSessionsReportCsv(rows);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"academic-session-report.csv\"")
                .body(csv);
    }

    @GetMapping
    public ResponseEntity<List<Session>> getAllSessions(
            Authentication authentication,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Session> sessions = sessionService.getAllSessions(rs.departmentIdFilter());
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Session> getSessionById(Authentication authentication, @PathVariable Long id) {
        Optional<Session> session = sessionService.getSessionById(id);
        if (session.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, session.get().getDepartmentId())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session.get());
    }

    @GetMapping("/lecturer/{lecturerName}")
    public ResponseEntity<List<Session>> getSessionsByLecturerName(
            Authentication authentication,
            @PathVariable String lecturerName,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Session> sessions = sessionService.getSessionsByLecturerName(lecturerName, rs.departmentIdFilter());
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/semester/{semester}")
    public ResponseEntity<List<Session>> getSessionsBySemester(
            Authentication authentication,
            @PathVariable String semester,
            @RequestParam(required = false) Long departmentId) {
        DepartmentScopeAuth.ReadScope rs = DepartmentScopeAuth.resolveReadScope(authentication, departmentId);
        if (rs.hodWithoutDepartment()) {
            return ResponseEntity.ok(List.of());
        }
        List<Session> sessions = sessionService.getSessionsBySemester(semester, rs.departmentIdFilter());
        return ResponseEntity.ok(sessions);
    }

    @PostMapping
    public ResponseEntity<?> createSession(Authentication authentication, @RequestBody SessionRequest req) {
        try {
            if (req.getLecturerId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Lecturer ID is required"));
            }
            if (req.getCourseId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Course ID is required"));
            }
            if (req.getSemester() == null || req.getSemester().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Semester is required"));
            }
            if (req.getStartTime() == null || req.getStartTime().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start time is required"));
            }
            if (req.getEndTime() == null || req.getEndTime().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "End time is required"));
            }
            if (req.getGroupCode() == null || req.getGroupCode().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Group code is required"));
            }
            if (req.getSessionType() == null || req.getSessionType().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Session type is required"));
            }
            if (req.getSessionDate() == null || req.getSessionDate().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Session date is required"));
            }
            if (req.getChapters() == null || req.getChapters() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Chapters must be a positive number"));
            }

            Long departmentToSave = DepartmentScopeAuth.resolveDepartmentForCreate(authentication, req.getDepartmentId());

            Session session = new Session();
            session.setCourseId(req.getCourseId());
            session.setSemester(req.getSemester());
            session.setStartTime(LocalTime.parse(req.getStartTime()));
            session.setEndTime(LocalTime.parse(req.getEndTime()));
            session.setGroupCode(req.getGroupCode());
            session.setSessionType(req.getSessionType());
            session.setChapters(req.getChapters());
            session.setSessionDate(LocalDate.parse(req.getSessionDate()));

            Session createdSession = sessionService.createSession(
                    session, req.getLecturerId(), req.getCourseId(), departmentToSave);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdSession);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Session> updateSession(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody Session sessionDetails) {
        try {
            Optional<Session> existing = sessionService.getSessionById(id);
            if (existing.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, existing.get().getDepartmentId())) {
                return ResponseEntity.notFound().build();
            }
            Session updatedSession = sessionService.updateSession(id, sessionDetails);
            return ResponseEntity.ok(updatedSession);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(Authentication authentication, @PathVariable Long id) {
        try {
            Optional<Session> existing = sessionService.getSessionById(id);
            if (existing.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            if (DepartmentScopeAuth.hodCannotAccessDepartment(authentication, existing.get().getDepartmentId())) {
                return ResponseEntity.notFound().build();
            }
            sessionService.deleteSession(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
