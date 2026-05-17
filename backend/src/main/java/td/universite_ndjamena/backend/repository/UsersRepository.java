package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface UsersRepository extends JpaRepository<Users, Long> {
    
    Optional<Users> findByEmail(String email);

    @Query("SELECT u.department.id FROM Users u WHERE u.id = :userId AND u.department IS NOT NULL")
    Optional<Long> findDepartmentIdByUserId(@Param("userId") Long userId);

    List<Users> findByStatus(Users.UserStatus status);
    
    List<Users> findByRole(Users.UserRole role);

    List<Users> findByRoleAndDepartment_Id(Users.UserRole role, Long departmentId);

    Optional<Users> findFirstByNameIgnoreCaseAndRoleAndStatus(
            String name, Users.UserRole role, Users.UserStatus status);
    
    boolean existsByEmail(String email);
}
