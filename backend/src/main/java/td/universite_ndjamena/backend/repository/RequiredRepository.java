package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Required;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RequiredRepository extends JpaRepository<Required, Long> {

    /** Find the override row for a specific lecturer (lecturerId is unique). */
    Optional<Required> findByLecturerId(Long lecturerId);

    /** Check whether an override already exists for a lecturer. */
    boolean existsByLecturerId(Long lecturerId);
}