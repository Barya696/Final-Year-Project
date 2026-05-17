package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Tariff;
import td.universite_ndjamena.backend.service.TariffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tariffs")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class TariffController {

    @Autowired
    private TariffService tariffService;

    @GetMapping
    public ResponseEntity<List<Tariff>> getAllTariffs() {
        return ResponseEntity.ok(tariffService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tariff> getTariffById(@PathVariable Long id) {
        return ResponseEntity.ok(tariffService.getById(id));
    }

    @GetMapping("/grade/{grade}")
    public ResponseEntity<Tariff> getTariffByGrade(@PathVariable String grade) {
        return tariffService.getByGrade(grade)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Tariff> createTariff(@RequestBody Tariff tariff) {
        Tariff created = tariffService.create(tariff);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tariff> updateTariff(@PathVariable Long id, @RequestBody Tariff tariff) {
        return ResponseEntity.ok(tariffService.update(id, tariff));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTariff(@PathVariable Long id) {
        tariffService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
