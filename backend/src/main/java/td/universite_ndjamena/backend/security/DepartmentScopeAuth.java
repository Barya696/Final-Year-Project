package td.universite_ndjamena.backend.security;

import org.springframework.security.core.Authentication;
import td.universite_ndjamena.backend.config.JwtAuthFilter;
import td.universite_ndjamena.backend.model.Users;

/**
 * Resolves department read/create scope from {@link JwtAuthFilter.AuthPrincipal}:
 * HOD is always limited to {@code users.department_id}; other roles may pass an explicit filter or body id.
 */
public final class DepartmentScopeAuth {

    private DepartmentScopeAuth() {
    }

    /**
     * @param departmentIdFilter null = all departments (non-HOD only)
     * @param hodWithoutDepartment true when the HOD user has no {@code users.department_id}
     */
    public record ReadScope(boolean hodWithoutDepartment, Long departmentIdFilter) {
    }

    public static JwtAuthFilter.AuthPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtAuthFilter.AuthPrincipal p)) {
            throw new IllegalStateException("Not authenticated");
        }
        return p;
    }

    public static ReadScope resolveReadScope(Authentication auth, Long queryDepartmentId) {
        JwtAuthFilter.AuthPrincipal p = requirePrincipal(auth);
        if (!Users.UserRole.HOD.name().equals(p.role())) {
            return new ReadScope(false, queryDepartmentId);
        }
        Long hodDept = p.departmentId();
        if (hodDept == null) {
            return new ReadScope(true, null);
        }
        return new ReadScope(false, hodDept);
    }

    public static Long resolveDepartmentForCreate(Authentication auth, Long bodyDepartmentId) {
        JwtAuthFilter.AuthPrincipal p = requirePrincipal(auth);
        if (Users.UserRole.HOD.name().equals(p.role())) {
            if (p.departmentId() == null) {
                throw new IllegalArgumentException(
                        "Your HOD account has no users.department_id set. Assign a department to this user in Admin.");
            }
            return p.departmentId();
        }
        if (bodyDepartmentId == null) {
            throw new IllegalArgumentException("Department ID is required");
        }
        return bodyDepartmentId;
    }

    /** HOD may only access rows whose {@code department_id} equals their {@code users.department_id}. */
    public static boolean hodCannotAccessDepartment(Authentication auth, Long resourceDepartmentId) {
        JwtAuthFilter.AuthPrincipal p = requirePrincipal(auth);
        if (!Users.UserRole.HOD.name().equals(p.role())) {
            return false;
        }
        Long hodDept = p.departmentId();
        return hodDept == null || resourceDepartmentId == null || !hodDept.equals(resourceDepartmentId);
    }
}
