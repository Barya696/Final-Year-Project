package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.model.Archive;
import td.universite_ndjamena.backend.repository.ArchiveRepository;
import td.universite_ndjamena.backend.repository.TarifficationRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ArchiveService {

    private final ArchiveRepository archiveRepository;
    private final TarifficationRepository tarifficationRepository;

    public List<Archive> findAll() {
        return archiveRepository.findAll();
    }

    public Optional<Archive> findById(Long id) {
        return archiveRepository.findById(id);
    }

    public Optional<Archive> findByTarifficationId(Long tarifficationId) {
        return archiveRepository.findByTarifficationId(tarifficationId);
    }

    @Transactional
    public Archive archiveByTarifficationId(Long tarifficationId) {
        ensureTarifficationExists(tarifficationId);
        Archive row = archiveRepository.findByTarifficationId(tarifficationId)
                .orElseGet(() -> Archive.builder()
                        .tarifficationId(tarifficationId)
                        .archived(Boolean.TRUE)
                        .build());

        row.setArchived(Boolean.TRUE);
        row.setArchivedAt(LocalDateTime.now());
        return archiveRepository.save(row);
    }

    @Transactional
    public Archive unarchiveByTarifficationId(Long tarifficationId) {
        Archive row = archiveRepository.findByTarifficationId(tarifficationId)
                .orElseThrow(() -> new IllegalArgumentException("Archive row not found for tarifficationId: " + tarifficationId));
        row.setArchived(Boolean.FALSE);
        row.setUnarchivedAt(LocalDateTime.now());
        return archiveRepository.save(row);
    }

    private void ensureTarifficationExists(Long tarifficationId) {
        if (tarifficationId == null) {
            throw new IllegalArgumentException("tarifficationId is required");
        }
        if (!tarifficationRepository.existsById(tarifficationId)) {
            throw new IllegalArgumentException("Tariffication not found with id: " + tarifficationId);
        }
    }
}
