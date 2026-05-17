package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.dto.LecturerRequest;
import td.universite_ndjamena.backend.service.LecturerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lecturers")
@RequiredArgsConstructor
public class LecturerController {

    private final LecturerService lecturerService;

    /**
     * Get all lecturers
     */
    @GetMapping
    public ResponseEntity<List<Lecturer>> getAllLecturers() {
        List<Lecturer> lecturers = lecturerService.getAllLecturers();
        return ResponseEntity.ok(lecturers);
    }

    /**
     * Get lecturer by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Lecturer> getLecturerById(@PathVariable Long id) {
        return lecturerService.getLecturerById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get lecturer by name
     */
    @GetMapping("/name/{name}")
    public ResponseEntity<Lecturer> getLecturerByName(@PathVariable String name) {
        return lecturerService.findByLecturerName(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get lecturers by department
     */
    @GetMapping("/department/{department}")
    public ResponseEntity<List<Lecturer>> getLecturersByDepartment(@PathVariable String department) {
        List<Lecturer> lecturers = lecturerService.getLecturersByDepartment(department);
        return ResponseEntity.ok(lecturers);
    }

    /**
     * Get lecturers by grade
     */
    @GetMapping("/grade/{grade}")
    public ResponseEntity<List<Lecturer>> getLecturersByGrade(@PathVariable String grade) {
        List<Lecturer> lecturers = lecturerService.getLecturersByGrade(grade);
        return ResponseEntity.ok(lecturers);
    }

    /**
     * Get lecturers by department and grade
     */
    @GetMapping("/department/{department}/grade/{grade}")
    public ResponseEntity<List<Lecturer>> getLecturersByDepartmentAndGrade(
            @PathVariable String department,
            @PathVariable String grade) {
        List<Lecturer> lecturers = lecturerService.getLecturersByDepartmentAndGrade(department, grade);
        return ResponseEntity.ok(lecturers);
    }

    /**
     * Create a new lecturer
     */
    @PostMapping
    public ResponseEntity<?> createLecturer(@RequestBody LecturerRequest req) {
        try {
            // Validate required fields
            if (req.getLecturerName() == null || req.getLecturerName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Lecturer name is required"));
            }
            if (req.getGrade() == null || req.getGrade().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Grade is required"));
            }
            if (req.getDepartment() == null || req.getDepartment().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Department is required"));
            }
            
            // Convert DTO to entity
            Lecturer lecturer = new Lecturer();
            lecturer.setLecturerName(req.getLecturerName());
            lecturer.setGrade(req.getGrade());
            lecturer.setDepartment(req.getDepartment());
            
            Lecturer createdLecturer = lecturerService.createLecturer(lecturer);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdLecturer);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create lecturer: " + e.getMessage()));
        }
    }

    /**
     * Update lecturer information
     */
    @PutMapping("/{id}")
    public ResponseEntity<Lecturer> updateLecturer(@PathVariable Long id, @Valid @RequestBody Lecturer lecturerDetails) {
        try {
            Lecturer updatedLecturer = lecturerService.updateLecturer(id, lecturerDetails);
            return ResponseEntity.ok(updatedLecturer);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete lecturer by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteLecturer(@PathVariable Long id) {
        try {
            lecturerService.deleteLecturer(id);
            return ResponseEntity.ok(Map.of("message", "Lecturer deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Check if lecturer exists by ID
     */
    @GetMapping("/{id}/exists")
    public ResponseEntity<Boolean> lecturerExists(@PathVariable Long id) {
        return ResponseEntity.ok(lecturerService.lecturerExists(id));
    }
}
