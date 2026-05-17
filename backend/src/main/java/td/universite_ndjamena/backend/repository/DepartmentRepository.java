package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    
    Optional<Department> findByDepartmentName(String departmentName);
    
    List<Department> findByHod(String hod);
    
    boolean existsByDepartmentName(String departmentName);
}
