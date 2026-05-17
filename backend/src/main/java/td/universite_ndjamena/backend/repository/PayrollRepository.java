package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import td.universite_ndjamena.backend.model.Payroll;

public interface PayrollRepository extends JpaRepository<Payroll, Long> {
}
