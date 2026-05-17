package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.model.Permission;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.repository.PermissionRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PermissionService {

    private final PermissionRepository permissionRepository;

    public List<Permission> getAllPermissions() {
        ensureSeededDefaults();
        return permissionRepository.findAll();
    }

    public List<Permission> getPermissionsByRole(Users.UserRole role) {
        ensureSeededDefaults();
        List<Permission> permissions = permissionRepository.findByRole(role);
        if (permissions.isEmpty()) {
            seedRoleDefaults(role);
            return permissionRepository.findByRole(role);
        }
        return permissions;
    }

    public List<Permission> saveMatrix(List<PermissionUpdate> updates) {
        ensureSeededDefaults();
        for (PermissionUpdate update : updates) {
            Permission permission = permissionRepository
                    .findByRoleAndPage(update.role(), update.page())
                    .orElseGet(() -> Permission.builder()
                            .role(update.role())
                            .page(update.page())
                            .allowed(false)
                            .build());
            permission.setAllowed(update.allowed());
            permissionRepository.save(permission);
        }
        return permissionRepository.findAll();
    }

    private void ensureSeededDefaults() {
        if (permissionRepository.count() > 0) return;
        for (Users.UserRole role : Users.UserRole.values()) {
            seedRoleDefaults(role);
        }
    }

    private void seedRoleDefaults(Users.UserRole role) {
        Map<Permission.PermissionPage, Boolean> defaults = defaultMatrixByRole().get(role);
        List<Permission> toSave = new ArrayList<>();
        for (Permission.PermissionPage page : Permission.PermissionPage.values()) {
            boolean allowed = defaults != null && Boolean.TRUE.equals(defaults.get(page));
            toSave.add(Permission.builder()
                    .role(role)
                    .page(page)
                    .allowed(allowed)
                    .build());
        }
        permissionRepository.saveAll(toSave);
    }

    private Map<Users.UserRole, Map<Permission.PermissionPage, Boolean>> defaultMatrixByRole() {
        return Map.of(
                Users.UserRole.ADMIN, allPages(true),
                Users.UserRole.HOD, Map.of(
                        Permission.PermissionPage.TARIFF, false,
                        Permission.PermissionPage.COURSE_ASSIGNMENT, true,
                        Permission.PermissionPage.CLASSIFIED, false,
                        Permission.PermissionPage.INTEGRATION, false,
                        Permission.PermissionPage.REQUIRED, false,
                        Permission.PermissionPage.SESSIONS, true,
                        Permission.PermissionPage.TEACHING_SCHEDULE, true,
                        Permission.PermissionPage.ARCHIVE, true
                ),
                Users.UserRole.VICE_DEAN, Map.of(
                        Permission.PermissionPage.TARIFF, false,
                        Permission.PermissionPage.COURSE_ASSIGNMENT, false,
                        Permission.PermissionPage.CLASSIFIED, true,
                        Permission.PermissionPage.INTEGRATION, false,
                        Permission.PermissionPage.REQUIRED, false,
                        Permission.PermissionPage.SESSIONS, true,
                        Permission.PermissionPage.TEACHING_SCHEDULE, true,
                        Permission.PermissionPage.ARCHIVE, true
                ),
                Users.UserRole.AMO, Map.of(
                        Permission.PermissionPage.TARIFF, false,
                        Permission.PermissionPage.COURSE_ASSIGNMENT, false,
                        Permission.PermissionPage.CLASSIFIED, true,
                        Permission.PermissionPage.INTEGRATION, false,
                        Permission.PermissionPage.REQUIRED, true,
                        Permission.PermissionPage.SESSIONS, true,
                        Permission.PermissionPage.TEACHING_SCHEDULE, true,
                        Permission.PermissionPage.ARCHIVE, true
                ),
                Users.UserRole.FINANCE_OFFICER, Map.of(
                        Permission.PermissionPage.TARIFF, true,
                        Permission.PermissionPage.COURSE_ASSIGNMENT, false,
                        Permission.PermissionPage.CLASSIFIED, false,
                        Permission.PermissionPage.INTEGRATION, false,
                        Permission.PermissionPage.REQUIRED, false,
                        Permission.PermissionPage.SESSIONS, false,
                        Permission.PermissionPage.TEACHING_SCHEDULE, true,
                        Permission.PermissionPage.ARCHIVE, true
                ),
                Users.UserRole.DEAN, Map.of(
                        Permission.PermissionPage.TARIFF, false,
                        Permission.PermissionPage.COURSE_ASSIGNMENT, false,
                        Permission.PermissionPage.CLASSIFIED, true,
                        Permission.PermissionPage.INTEGRATION, false,
                        Permission.PermissionPage.REQUIRED, false,
                        Permission.PermissionPage.SESSIONS, true,
                        Permission.PermissionPage.TEACHING_SCHEDULE, true,
                        Permission.PermissionPage.ARCHIVE, true
                )
        );
    }

    private Map<Permission.PermissionPage, Boolean> allPages(boolean value) {
        return List.of(Permission.PermissionPage.values())
                .stream()
                .collect(Collectors.toMap(page -> page, page -> value));
    }

    public record PermissionUpdate(
            Users.UserRole role,
            Permission.PermissionPage page,
            boolean allowed
    ) {}
}
