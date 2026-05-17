package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    
    Optional<Course> findByCode(String code);
    
    Optional<Course> findByCourseName(String courseName);
    
    List<Course> findByDepartment(String department);
    
    List<Course> findByChapters(Integer chapters);
    
    boolean existsByCode(String code);
}
