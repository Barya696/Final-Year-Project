package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Lecturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface LecturerRepository extends JpaRepository<Lecturer, Long> {
    
    Optional<Lecturer> findByLecturerName(String lecturerName);
    
    List<Lecturer> findByDepartment(String department);
    
    List<Lecturer> findByGrade(String grade);
    
    List<Lecturer> findByDepartmentAndGrade(String department, String grade);
}
