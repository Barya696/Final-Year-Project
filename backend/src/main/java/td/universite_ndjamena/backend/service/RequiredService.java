package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Required;
import td.universite_ndjamena.backend.repository.RequiredRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RequiredService {

    private final RequiredRepository requiredRepository;

    public RequiredService(RequiredRepository requiredRepository) {
        this.requiredRepository = requiredRepository;
    }

    // ── Read ──────────────────────────────────────────────────────────────

    /** All overrides (used by the monitoring officer's overview table). */
    public List<Required> findAll() {
        return requiredRepository.findAll();
    }

    /** Single override by primary key. */
    public Optional<Required> findById(Long id) {
        return requiredRepository.findById(id);
    }

    /**
     * Lookup by lecturerId.
     * Returns empty when the lecturer still uses the global default (300 min).
     */
    public Optional<Required> findByLecturerId(Long lecturerId) {
        return requiredRepository.findByLecturerId(lecturerId);
    }

    // ── Upsert ────────────────────────────────────────────────────────────

    /**
     * Create-or-update the required-hours override for a lecturer.
     * If a row already exists for that lecturerId it is updated in place;
     * otherwise a new row is inserted.
     */
    public Required upsert(Long lecturerId, int requiredHours) {
        Required row = requiredRepository
                .findByLecturerId(lecturerId)
                .orElse(new Required(lecturerId, requiredHours));

        row.setRequiredHours(requiredHours);
        return requiredRepository.save(row);
    }

    // ── Delete ────────────────────────────────────────────────────────────

    /** Remove an override — the lecturer falls back to the global default. */
    public void deleteById(Long id) {
        requiredRepository.deleteById(id);
    }

    /** Remove the override for a lecturer (by lecturerId, not PK). */
    public void deleteByLecturerId(Long lecturerId) {
        requiredRepository.findByLecturerId(lecturerId)
                .ifPresent(requiredRepository::delete);
    }
}