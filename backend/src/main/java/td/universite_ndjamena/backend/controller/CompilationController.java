package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Compilation;
import td.universite_ndjamena.backend.service.CompilationService;
import td.universite_ndjamena.backend.dto.CompileRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class CompilationController {

    @Autowired
    private CompilationService compilationService;

    /** GET /api/compilations */
    @GetMapping("/api/compilations")
    public ResponseEntity<List<Compilation>> getAllCompilations() {
        return ResponseEntity.ok(compilationService.getAll());
    }

    /** GET /api/compilations/{id} */
    @GetMapping("/api/compilations/{id}")
    public ResponseEntity<Compilation> getCompilationById(@PathVariable Long id) {
        return compilationService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/classifications/compile
     * Body: { "lecturerId": 42 }
     * 201 on success, 409 if already compiled, 400 if a semester is missing.
     */
    @PostMapping("/api/classifications/compile")
    public ResponseEntity<Compilation> compileClassifications(
            @Valid @RequestBody CompileRequest request) {
        System.out.println(">>> lecturerId received: " + request.getLecturerId());
        Compilation compilation =
                compilationService.compileByLecturerId(request.getLecturerId());
        return ResponseEntity.status(HttpStatus.CREATED).body(compilation);
    }

    /** PUT /api/compilations/{id} */
    @PutMapping("/api/compilations/{id}")
    public ResponseEntity<Compilation> updateCompilation(
            @PathVariable Long id,
            @RequestBody Compilation compilation) {
        return ResponseEntity.ok(compilationService.updateCompilation(id, compilation));
    }

    /** DELETE /api/compilations/{id} */
    @DeleteMapping("/api/compilations/{id}")
    public ResponseEntity<Void> deleteCompilation(@PathVariable Long id) {
        compilationService.deleteCompilation(id);
        return ResponseEntity.noContent().build();
    }
}