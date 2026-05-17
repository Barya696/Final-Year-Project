package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import td.universite_ndjamena.backend.model.Permission;
import td.universite_ndjamena.backend.model.Users;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    List<Permission> findByRole(Users.UserRole role);
    Optional<Permission> findByRoleAndPage(Users.UserRole role, Permission.PermissionPage page);
}
