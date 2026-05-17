package td.universite_ndjamena.backend.controller;

import td.universite_ndjamena.backend.model.Group;
import td.universite_ndjamena.backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    /**
     * Get all groups
     */
    @GetMapping
    public ResponseEntity<List<Group>> getAllGroups() {
        List<Group> groups = groupService.getAllGroups();
        return ResponseEntity.ok(groups);
    }

    /**
     * Get group by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Group> getGroupById(@PathVariable Long id) {
        return groupService.getGroupById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get group by code
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<Group> getGroupByCode(@PathVariable String code) {
        return groupService.getGroupByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get group by name
     */
    @GetMapping("/name/{groupName}")
    public ResponseEntity<Group> getGroupByName(@PathVariable String groupName) {
        return groupService.getGroupByName(groupName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get groups by level
     */
    @GetMapping("/level/{level}")
    public ResponseEntity<List<Group>> getGroupsByLevel(@PathVariable Integer level) {
        List<Group> groups = groupService.getGroupsByLevel(level);
        return ResponseEntity.ok(groups);
    }

    /**
     * Create a new group
     */
    @PostMapping
    public ResponseEntity<Group> createGroup(@Valid @RequestBody Group group) {
        try {
            Group createdGroup = groupService.createGroup(group);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdGroup);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update group information
     */
    @PutMapping("/{id}")
    public ResponseEntity<Group> updateGroup(@PathVariable Long id, @Valid @RequestBody Group groupDetails) {
        try {
            Group updatedGroup = groupService.updateGroup(id, groupDetails);
            return ResponseEntity.ok(updatedGroup);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete group by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteGroup(@PathVariable Long id) {
        try {
            groupService.deleteGroup(id);
            return ResponseEntity.ok(Map.of("message", "Group deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Check if group exists by ID
     */
    @GetMapping("/{id}/exists")
    public ResponseEntity<Boolean> groupExists(@PathVariable Long id) {
        return ResponseEntity.ok(groupService.groupExists(id));
    }
}
