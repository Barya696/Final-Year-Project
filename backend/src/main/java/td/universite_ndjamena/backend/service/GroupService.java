package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Group;
import td.universite_ndjamena.backend.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupService {

    private final GroupRepository groupRepository;

    /**
     * Create a new group
     */
    public Group createGroup(Group group) {
        if (groupRepository.existsByCode(group.getCode())) {
            throw new IllegalArgumentException("Group code already exists: " + group.getCode());
        }
        
        return groupRepository.save(group);
    }

    /**
     * Get group by ID
     */
    public Optional<Group> getGroupById(Long id) {
        return groupRepository.findById(id);
    }

    /**
     * Get group by code
     */
    public Optional<Group> getGroupByCode(String code) {
        return groupRepository.findByCode(code);
    }

    /**
     * Get group by name
     */
    public Optional<Group> getGroupByName(String groupName) {
        return groupRepository.findByGroupName(groupName);
    }

    /**
     * Get all groups
     */
    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    /**
     * Get groups by level
     */
    public List<Group> getGroupsByLevel(Integer level) {
        return groupRepository.findByLevel(level);
    }

    /**
     * Update group information
     */
    public Group updateGroup(Long id, Group groupDetails) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Group not found with id: " + id));

        // Check if new code exists (if changed)
        if (!group.getCode().equals(groupDetails.getCode()) && 
            groupRepository.existsByCode(groupDetails.getCode())) {
            throw new IllegalArgumentException("Group code already exists: " + groupDetails.getCode());
        }

        group.setGroupName(groupDetails.getGroupName());
        group.setCode(groupDetails.getCode());
        group.setLevel(groupDetails.getLevel());

        return groupRepository.save(group);
    }

    /**
     * Delete group by ID
     */
    public void deleteGroup(Long id) {
        if (!groupRepository.existsById(id)) {
            throw new IllegalArgumentException("Group not found with id: " + id);
        }
        groupRepository.deleteById(id);
    }

    /**
     * Check if group exists by ID
     */
    public boolean groupExists(Long id) {
        return groupRepository.existsById(id);
    }
}
