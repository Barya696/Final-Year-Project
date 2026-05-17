package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Tariffication;
import td.universite_ndjamena.backend.service.TarifficationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class TarifficationController {

    @Autowired
    private TarifficationService tarifficationService;

    @GetMapping("/api/tariffication")
    public ResponseEntity<List<Tariffication>> getAllTariffications() {
        return ResponseEntity.ok(tarifficationService.getAll());
    }

    @GetMapping("/api/tariffication/compilation/{compilationId}")
    public ResponseEntity<Tariffication> getByCompilationId(@PathVariable Long compilationId) {
        return tarifficationService.getByCompilationId(compilationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/api/tariffication/compilation/{compilationId}")
    public ResponseEntity<Tariffication> tariffyCompilation(@PathVariable Long compilationId) {
        return ResponseEntity.ok(tarifficationService.tariffyCompilation(compilationId));
    }

    /**
     * Deletes the tariffication record for the given compilation and resets
     * the compilation status back to PENDING.
     */
    @DeleteMapping("/api/tariffication/compilation/{compilationId}")
    public ResponseEntity<Void> deleteTariffication(@PathVariable Long compilationId) {
        tarifficationService.deleteTarifficationByCompilationId(compilationId);
        return ResponseEntity.noContent().build();
    }
}