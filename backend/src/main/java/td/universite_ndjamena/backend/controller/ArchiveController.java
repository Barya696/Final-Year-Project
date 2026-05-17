package td.universite_ndjamena.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import td.universite_ndjamena.backend.model.Archive;
import td.universite_ndjamena.backend.service.ArchiveService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/archive")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class ArchiveController {

    private final ArchiveService archiveService;

    @GetMapping
    @PreAuthorize("hasRole('DEAN') or hasRole('ADMIN')")
    public ResponseEntity<List<Archive>> listAll() {
        return ResponseEntity.ok(archiveService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('DEAN') or hasRole('ADMIN')")
    public ResponseEntity<Archive> getById(@PathVariable Long id) {
        return archiveService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/tariffication/{tarifficationId}")
    @PreAuthorize("hasRole('DEAN') or hasRole('ADMIN')")
    public ResponseEntity<Archive> getByTarifficationId(@PathVariable Long tarifficationId) {
        return archiveService.findByTarifficationId(tarifficationId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/tariffication/{tarifficationId}")
    @PreAuthorize("hasRole('DEAN') or hasRole('ADMIN')")
    public ResponseEntity<?> archive(@PathVariable Long tarifficationId) {
        try {
            return ResponseEntity.ok(archiveService.archiveByTarifficationId(tarifficationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/tariffication/{tarifficationId}/unarchive")
    @PreAuthorize("hasRole('DEAN') or hasRole('ADMIN')")
    public ResponseEntity<?> unarchive(@PathVariable Long tarifficationId) {
        try {
            return ResponseEntity.ok(archiveService.unarchiveByTarifficationId(tarifficationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
