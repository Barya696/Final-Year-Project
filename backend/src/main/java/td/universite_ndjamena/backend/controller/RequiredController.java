package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Required;
import td.universite_ndjamena.backend.service.RequiredService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/required")
@CrossOrigin(origins = "*")
public class RequiredController {

    private final RequiredService requiredService;

    public RequiredController(RequiredService requiredService) {
        this.requiredService = requiredService;
    }

    // ── GET /api/required ─────────────────────────────────────────────────
    /** Return every lecturer override. */
    @GetMapping
    public List<Required> getAll() {
        return requiredService.findAll();
    }

    // ── GET /api/required/lecturer/{lecturerId} ───────────────────────────
    /**
     * Return the required-hours override for one lecturer.
     * 404 when none exists (caller should fall back to the global default).
     */
    @GetMapping("/lecturer/{lecturerId}")
    public ResponseEntity<Required> getByLecturer(@PathVariable Long lecturerId) {
        return requiredService.findByLecturerId(lecturerId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/required ────────────────────────────────────────────────
    /**
     * Create or update the required-hours override for a lecturer.
     *
     * Request body (JSON):
     * {
     *   "lecturerId":    123,
     *   "requiredHours": 360
     * }
     */
    @PostMapping
    public ResponseEntity<Required> upsert(@RequestBody Map<String, Object> body) {
        Long lecturerId    = Long.valueOf(body.get("lecturerId").toString());
        int  requiredHours = Integer.parseInt(body.get("requiredHours").toString());

        if (requiredHours <= 0) {
            return ResponseEntity.badRequest().build();
        }

        Required saved = requiredService.upsert(lecturerId, requiredHours);
        return ResponseEntity.ok(saved);
    }

    // ── DELETE /api/required/lecturer/{lecturerId} ────────────────────────
    /**
     * Remove the override for a lecturer — they revert to the global default.
     */
    @DeleteMapping("/lecturer/{lecturerId}")
    public ResponseEntity<Void> deleteByLecturer(@PathVariable Long lecturerId) {
        requiredService.deleteByLecturerId(lecturerId);
        return ResponseEntity.noContent().build();
    }

    // ── DELETE /api/required/{id} ─────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id) {
        requiredService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}