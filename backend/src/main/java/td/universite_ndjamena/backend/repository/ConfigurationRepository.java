package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import td.universite_ndjamena.backend.model.Configuration;

public interface ConfigurationRepository extends JpaRepository<Configuration, Long> {
}
