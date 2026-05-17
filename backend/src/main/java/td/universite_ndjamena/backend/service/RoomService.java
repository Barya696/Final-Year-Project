package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Room;
import td.universite_ndjamena.backend.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;

    /**
     * Create a new room
     */
    public Room createRoom(Room room) {
        if (roomRepository.existsByRoomName(room.getRoomName())) {
            throw new IllegalArgumentException("Room name already exists: " + room.getRoomName());
        }
        
        return roomRepository.save(room);
    }

    /**
     * Get room by ID
     */
    public Optional<Room> getRoomById(Long id) {
        return roomRepository.findById(id);
    }

    /**
     * Get room by room name
     */
    public Optional<Room> getRoomByRoomName(String roomName) {
        return roomRepository.findByRoomName(roomName);
    }

    /**
     * Get all rooms
     */
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    /**
     * Update room information
     */
    public Room updateRoom(Long id, Room roomDetails) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + id));

        // Check if new room name exists (if changed)
        if (!room.getRoomName().equals(roomDetails.getRoomName()) && 
            roomRepository.existsByRoomName(roomDetails.getRoomName())) {
            throw new IllegalArgumentException("Room name already exists: " + roomDetails.getRoomName());
        }

        room.setRoomName(roomDetails.getRoomName());

        return roomRepository.save(room);
    }

    /**
     * Delete room by ID
     */
    public void deleteRoom(Long id) {
        if (!roomRepository.existsById(id)) {
            throw new IllegalArgumentException("Room not found with id: " + id);
        }
        roomRepository.deleteById(id);
    }

    /**
     * Check if room exists by ID
     */
    public boolean roomExists(Long id) {
        return roomRepository.existsById(id);
    }
}
