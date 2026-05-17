package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.model.Department;
import td.universite_ndjamena.backend.dto.CreateUserDTO;
import td.universite_ndjamena.backend.dto.UpdateUserDTO;
import td.universite_ndjamena.backend.repository.UsersRepository;
import td.universite_ndjamena.backend.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UsersService {

    private final UsersRepository usersRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecuritySettingsService securitySettingsService;

    /**
     * Create a new user with encrypted password
     */
    public Users createUser(Users user) {
        if (usersRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + user.getEmail());
        }
        securitySettingsService.validatePasswordOrThrow(user.getPassword());

        // Encrypt the password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getStatus() == null) {
            user.setStatus(Users.UserStatus.ACTIVE);
        }
        
        return usersRepository.save(user);
    }

    /**
     * Get user by ID
     */
    public Optional<Users> getUserById(Long id) {
        return usersRepository.findById(id);
    }

    /**
     * Get user by email
     */
    public Optional<Users> getUserByEmail(String email) {
        return usersRepository.findByEmail(email);
    }

    /**
     * Get all users
     */
    public List<Users> getAllUsers() {
        return usersRepository.findAll();
    }

    /**
     * Get all active users
     */
    public List<Users> getActiveUsers() {
        return usersRepository.findByStatus(Users.UserStatus.ACTIVE);
    }

    /**
     * Get users by role
     */
    public List<Users> getUsersByRole(Users.UserRole role) {
        return usersRepository.findByRole(role);
    }

    /**
     * Get users by status
     */
    public List<Users> getUsersByStatus(Users.UserStatus status) {
        return usersRepository.findByStatus(status);
    }

    /**
     * Create a new user from DTO with encrypted password and department resolution
     */
    public Users createUserFromDTO(CreateUserDTO createUserDTO) {
        if (usersRepository.existsByEmail(createUserDTO.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + createUserDTO.getEmail());
        }
        securitySettingsService.validatePasswordOrThrow(createUserDTO.getPassword());

        if ("HOD".equals(createUserDTO.getRole())
                && (createUserDTO.getDepartmentId() == null)) {
            throw new IllegalArgumentException("HOD users must be assigned to a department");
        }

        Users user = new Users();
        user.setName(createUserDTO.getName());
        user.setEmail(createUserDTO.getEmail());
        user.setPassword(passwordEncoder.encode(createUserDTO.getPassword()));
        user.setRole(Users.UserRole.valueOf(createUserDTO.getRole()));

        // Set department if provided and role is HOD
        if (createUserDTO.getDepartmentId() != null) {
            Department department = departmentRepository.findById(createUserDTO.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found with id: " + createUserDTO.getDepartmentId()));
            user.setDepartment(department);
        }
        
        // Set status
        if (createUserDTO.getStatus() != null) {
            user.setStatus(Users.UserStatus.valueOf(createUserDTO.getStatus()));
        } else {
            user.setStatus(Users.UserStatus.ACTIVE);
        }
        
        return usersRepository.save(user);
    }

    /**
     * Update user information from DTO (excluding password)
     */
    public Users updateUserFromDTO(Long id, UpdateUserDTO updateUserDTO) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));

        // Check if new email exists (if changed)
        if (!user.getEmail().equals(updateUserDTO.getEmail()) && 
            usersRepository.existsByEmail(updateUserDTO.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + updateUserDTO.getEmail());
        }

        user.setName(updateUserDTO.getName());
        user.setEmail(updateUserDTO.getEmail());
        user.setRole(Users.UserRole.valueOf(updateUserDTO.getRole()));
        user.setStatus(Users.UserStatus.valueOf(updateUserDTO.getStatus()));
        
        // Handle department: set if provided and role is HOD, otherwise set to null
        if (updateUserDTO.getDepartmentId() != null && updateUserDTO.getRole().equals("HOD")) {
            Department department = departmentRepository.findById(updateUserDTO.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found with id: " + updateUserDTO.getDepartmentId()));
            user.setDepartment(department);
        } else {
            user.setDepartment(null);
        }

        return usersRepository.save(user);
    }

    /**
     * Update user password
     */
    public Users updatePassword(Long id, String newPassword) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));

        securitySettingsService.validatePasswordOrThrow(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        return usersRepository.save(user);
    }

    /**
     * Toggle user status between ACTIVE and INACTIVE
     */
    public Users toggleUserStatus(Long id) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));

        if (user.getStatus() == Users.UserStatus.ACTIVE) {
            user.setStatus(Users.UserStatus.INACTIVE);
        } else if (user.getStatus() == Users.UserStatus.INACTIVE) {
            user.setStatus(Users.UserStatus.ACTIVE);
        }
        
        return usersRepository.save(user);
    }

    /**
     * Update user status to a specific status
     */
    public Users updateUserStatus(Long id, Users.UserStatus newStatus) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));

        user.setStatus(newStatus);
        return usersRepository.save(user);
    }

    /**
     * Delete user by ID
     */
    public void deleteUser(Long id) {
        if (!usersRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found with id: " + id);
        }
        usersRepository.deleteById(id);
    }

    /**
     * Check if user exists by email
     */
    public boolean userExistsByEmail(String email) {
        return usersRepository.existsByEmail(email);
    }
}
