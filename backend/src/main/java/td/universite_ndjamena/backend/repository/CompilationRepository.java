package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Compilation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompilationRepository extends JpaRepository<Compilation, Long> {

    List<Compilation> findByLecturerId(Long lecturerId);

    Optional<Compilation> findByLecturerIdAndDepartmentId(Long lecturerId, Long departmentId);

    boolean existsByLecturerId(Long lecturerId);
}