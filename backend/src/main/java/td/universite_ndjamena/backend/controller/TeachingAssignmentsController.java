package td.universite_ndjamena.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import td.universite_ndjamena.backend.dto.TeachingAssignmentRequest;
import td.universite_ndjamena.backend.model.TeachingAssignment;
import td.universite_ndjamena.backend.service.TeachingAssignmentsService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teaching-assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class TeachingAssignmentsController {

    private final TeachingAssignmentsService teachingAssignmentsService;

    @GetMapping
    public ResponseEntity<List<TeachingAssignment>> list(@RequestParam(required = false) String semester) {
        return ResponseEntity.ok(teachingAssignmentsService.findAll(semester));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeachingAssignment> getById(@PathVariable Long id) {
        return teachingAssignmentsService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('HOD') or hasRole('ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody TeachingAssignmentRequest req) {
        try {
            TeachingAssignment created = teachingAssignmentsService.create(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('HOD') or hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody TeachingAssignmentRequest req) {
        try {
            return ResponseEntity.ok(teachingAssignmentsService.update(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('HOD') or hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            teachingAssignmentsService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
