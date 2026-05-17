package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import td.universite_ndjamena.backend.model.TrustedDevice;

import java.util.Optional;

public interface TrustedDeviceRepository extends JpaRepository<TrustedDevice, Long> {

    boolean existsByUser_IdAndDeviceId(Long userId, String deviceId);

    Optional<TrustedDevice> findByUser_IdAndDeviceId(Long userId, String deviceId);

    void deleteAllByUser_Id(Long userId);
}
