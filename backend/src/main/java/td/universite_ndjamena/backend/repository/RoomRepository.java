package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    
    Optional<Room> findByRoomName(String roomName);
    
    boolean existsByRoomName(String roomName);
}
