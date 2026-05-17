package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import td.universite_ndjamena.backend.model.SecuritySettings;

public interface SecuritySettingsRepository extends JpaRepository<SecuritySettings, Long> {
}
