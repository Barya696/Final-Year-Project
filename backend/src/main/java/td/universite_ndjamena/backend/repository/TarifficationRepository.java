package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Tariffication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TarifficationRepository extends JpaRepository<Tariffication, Long> {
    Optional<Tariffication> findByCompilationId(Long compilationId);
}