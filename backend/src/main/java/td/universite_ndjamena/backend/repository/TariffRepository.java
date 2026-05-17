package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Tariff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TariffRepository extends JpaRepository<Tariff, Long> {
    Optional<Tariff> findByGradeIgnoreCase(String grade);
}