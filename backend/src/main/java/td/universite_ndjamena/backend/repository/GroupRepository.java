package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    
    Optional<Group> findByCode(String code);
    
    Optional<Group> findByGroupName(String groupName);
    
    List<Group> findByLevel(Integer level);
    
    boolean existsByCode(String code);
}
