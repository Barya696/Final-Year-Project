package td.universite_ndjamena.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import td.universite_ndjamena.backend.dto.TimetableRequest;
import td.universite_ndjamena.backend.model.Timetable;
import td.universite_ndjamena.backend.service.TimetableService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/timetables")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class TimetableController {

    private final TimetableService timetableService;

    /** All entries, or filter by semester when {@code semester} is provided */
    @GetMapping
    public ResponseEntity<List<Timetable>> list(@RequestParam(required = false) String semester) {
        return ResponseEntity.ok(timetableService.findBySemester(semester));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Timetable> getById(@PathVariable Long id) {
        return timetableService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody TimetableRequest req) {
        try {
            Timetable created = timetableService.create(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody TimetableRequest req) {
        try {
            return ResponseEntity.ok(timetableService.update(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            timetableService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
