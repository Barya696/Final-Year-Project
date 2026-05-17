package td.universite_ndjamena.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import td.universite_ndjamena.backend.model.Configuration;
import td.universite_ndjamena.backend.model.Payroll;
import td.universite_ndjamena.backend.service.ConfigurationService;
import td.universite_ndjamena.backend.service.PayrollService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/configuration")
@RequiredArgsConstructor
public class ConfigurationController {

    private final ConfigurationService configurationService;
    private final PayrollService payrollService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Configuration> getConfiguration() {
        return ResponseEntity.ok(configurationService.getConfiguration());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateConfiguration(@RequestBody Configuration configuration) {
        try {
            return ResponseEntity.ok(configurationService.updateConfiguration(configuration));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/payroll")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Payroll>> getPayrollRows() {
        return ResponseEntity.ok(payrollService.getAll());
    }

    @PostMapping("/payroll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createPayrollRow(@RequestBody Payroll payroll) {
        try {
            return ResponseEntity.ok(payrollService.create(payroll));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/payroll/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePayrollRow(@PathVariable Long id, @RequestBody Payroll payroll) {
        try {
            return ResponseEntity.ok(payrollService.update(id, payroll));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/payroll/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePayrollRow(@PathVariable Long id) {
        payrollService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
