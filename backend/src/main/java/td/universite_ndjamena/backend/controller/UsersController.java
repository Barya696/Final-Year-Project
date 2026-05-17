package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.dto.CreateUserDTO;
import td.universite_ndjamena.backend.dto.UpdateUserDTO;
import td.universite_ndjamena.backend.service.UsersService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import td.universite_ndjamena.backend.annotation.Auditable;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UsersController {

    private final UsersService usersService;

    /**
     * Get all users (admin only)
     */
    @GetMapping
    public ResponseEntity<List<Users>> getAllUsers() {
        List<Users> users = usersService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * Get user by ID (admin or self)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @usersService.getUserById(#id).get().getId() == authentication.principal.id")
    public ResponseEntity<Users> getUserById(@PathVariable Long id) {
        return usersService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all active users (admin only)
     */
    @GetMapping("/active/list")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Users>> getActiveUsers() {
        List<Users> users = usersService.getActiveUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * Get users by role (admin only)
     */
    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Users>> getUsersByRole(@PathVariable Users.UserRole role) {
        List<Users> users = usersService.getUsersByRole(role);
        return ResponseEntity.ok(users);
    }

    /**
     * Get users by status (admin only)
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Users>> getUsersByStatus(@PathVariable Users.UserStatus status) {
        List<Users> users = usersService.getUsersByStatus(status);
        return ResponseEntity.ok(users);
    }

    /**
     * Create a new user (admin only)
     */
    @PostMapping
    @Auditable(action = "CREATE", entity = "USER")
    public ResponseEntity<Users> createUser(@Valid @RequestBody CreateUserDTO createUserDTO) {
        Users createdUser = usersService.createUserFromDTO(createUserDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    /**
     * Update user information (admin only)
     */
    @PutMapping("/{id}")
    @Auditable(action = "UPDATE", entity = "USER", idParam = "id")
    public ResponseEntity<Users> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserDTO updateUserDTO) {
        try {
            Users updatedUser = usersService.updateUserFromDTO(id, updateUserDTO);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Update user password (admin only)
     */
    @PatchMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "UPDATE", entity = "USER_PASSWORD", idParam = "id")
    public ResponseEntity<Map<String, String>> updatePassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            String newPassword = request.get("password");
            if (newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password cannot be empty"));
            }
            usersService.updatePassword(id, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Toggle user status between ACTIVE and INACTIVE (admin only)
     */
    @PatchMapping("/{id}/status")
    @Auditable(action = "UPDATE", entity = "USER_STATUS", idParam = "id")
    public ResponseEntity<Users> toggleUserStatus(@PathVariable Long id) {
        try {
            Users updatedUser = usersService.toggleUserStatus(id);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Update user status to a specific value (admin only)
     */
    @PatchMapping("/{id}/status/{newStatus}")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "UPDATE", entity = "USER_STATUS", idParam = "id")
    public ResponseEntity<Users> updateUserStatus(@PathVariable Long id, @PathVariable Users.UserStatus newStatus) {
        try {
            Users updatedUser = usersService.updateUserStatus(id, newStatus);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete user by ID (admin only)
     */
    @DeleteMapping("/{id}")
    @Auditable(action = "DELETE", entity = "USER", idParam = "id")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            usersService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Check if email exists (admin only)
     */
    @GetMapping("/check/email/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Boolean>> checkEmailExists(@PathVariable String email) {
        boolean exists = usersService.userExistsByEmail(email);
        return ResponseEntity.ok(Map.of("exists", exists));
    }
}
