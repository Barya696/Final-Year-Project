package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import td.universite_ndjamena.backend.model.Archive;

import java.util.Optional;

@Repository
public interface ArchiveRepository extends JpaRepository<Archive, Long> {

    Optional<Archive> findByTarifficationId(Long tarifficationId);
}
