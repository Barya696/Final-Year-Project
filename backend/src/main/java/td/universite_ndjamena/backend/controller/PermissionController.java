package td.universite_ndjamena.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import td.universite_ndjamena.backend.model.Permission;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.service.PermissionService;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Permission>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN') or #role.name() == authentication.principal.role")
    public ResponseEntity<List<Permission>> getPermissionsByRole(@PathVariable Users.UserRole role) {
        return ResponseEntity.ok(permissionService.getPermissionsByRole(role));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Permission>> saveMatrix(@RequestBody List<PermissionService.PermissionUpdate> updates) {
        return ResponseEntity.ok(permissionService.saveMatrix(updates));
    }
}
