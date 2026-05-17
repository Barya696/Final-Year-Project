package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Compilation;
import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.model.Tariff;
import td.universite_ndjamena.backend.model.Tariffication;
import td.universite_ndjamena.backend.repository.CompilationRepository;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import td.universite_ndjamena.backend.repository.TariffRepository;
import td.universite_ndjamena.backend.repository.TarifficationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TarifficationService {

    @Autowired
    private TarifficationRepository tarifficationRepository;

    @Autowired
    private CompilationRepository compilationRepository;

    @Autowired
    private TariffRepository tariffRepository;

    @Autowired
    private LecturerRepository lecturerRepository;

    // ── Grade abbreviation map ─────────────────────────────────────────────
    private static final Map<String, String> GRADE_ABBR = Map.of(
            "PROFESSEUR_TITULAIRE",  "PT",
            "PROFESSEUR",            "P",
            "PROFESSOR",             "P",
            "MAITRE_CONFERENCE",     "MC",
            "MAITRE_ASSISTANT",      "MA",
            "ASSISTANT",             "A",
            "ATTACHE_UNIVERSITAIRE", "AU",
            "ATTACHE",               "AU"
    );

    // ── Public API ─────────────────────────────────────────────────────────

    public List<Tariffication> getAll() {
        return tarifficationRepository.findAll();
    }

    public Optional<Tariffication> getByCompilationId(Long compilationId) {
        return tarifficationRepository.findByCompilationId(compilationId);
    }

    public Tariffication tariffyCompilation(Long compilationId) {

        // 1. Load compilation — 404 if missing
        Compilation compilation = compilationRepository.findById(compilationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Compilation not found with ID: " + compilationId
                ));

        // 2. Compute costs
        final ExtraCosts costs = computeCosts(compilation);

        // 3. If already tariffied, return existing record without re-processing
        if (Compilation.TarifficationStatus.TARIFFIED
                .equals(compilation.getTarifficationStatus())) {
            return tarifficationRepository.findByCompilationId(compilationId)
                    .orElseGet(() -> createTarifficationRecord(compilationId, costs));
        }

        // 4. Mark compilation as tariffied and persist
        compilation.setTarifficationStatus(Compilation.TarifficationStatus.TARIFFIED);
        compilationRepository.save(compilation);

        // 5. Update existing tariffication record or create a new one
        Optional<Tariffication> existing =
                tarifficationRepository.findByCompilationId(compilationId);

        if (existing.isPresent()) {
            Tariffication record = existing.get();
            record.setTarifficationStatus(Tariffication.TarifficationStatus.TARIFFIED);
            record.setTariffiedAt(LocalDateTime.now());
            record.setSm1ExtraCost(costs.sm1());
            record.setSm2ExtraCost(costs.sm2());
            record.setTotalExtraCost(costs.total());
            return tarifficationRepository.save(record);
        }

        return createTarifficationRecord(compilationId, costs);
    }

    /**
     * Deletes the Tariffication record for the given compilationId and resets
     * the parent Compilation's status back to PENDING.
     * Throws 404 if no tariffication record exists for that compilation.
     */
    @Transactional
    public void deleteTarifficationByCompilationId(Long compilationId) {

        Tariffication tariffication = tarifficationRepository
                .findByCompilationId(compilationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No tariffication record found for compilation ID: " + compilationId
                ));

        // Reset the compilation status back to PENDING
        compilationRepository.findById(compilationId).ifPresent(compilation -> {
            compilation.setTarifficationStatus(Compilation.TarifficationStatus.PENDING);
            compilationRepository.save(compilation);
        });

        tarifficationRepository.delete(tariffication);
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private record ExtraCosts(Double sm1, Double sm2, Double total) {
        static ExtraCosts empty() {
            return new ExtraCosts(null, null, null);
        }
    }

    private ExtraCosts computeCosts(Compilation compilation) {
        Lecturer lecturer = lecturerRepository
                .findById(compilation.getLecturerId())
                .orElse(null);

        if (lecturer == null) return ExtraCosts.empty();

        String gradeKey = resolveGradeKey(lecturer.getGrade());
        Optional<Tariff> tariffOpt = tariffRepository.findByGradeIgnoreCase(gradeKey);

        if (tariffOpt.isEmpty()) return ExtraCosts.empty();

        double rate = tariffOpt.get().getRate();
        return new ExtraCosts(
                minutesToCost(compilation.getS1Extra(),       rate),
                minutesToCost(compilation.getS2Extra(),       rate),
                minutesToCost(compilation.getCombinedExtra(), rate)
        );
    }

    private Double minutesToCost(Integer minutes, double ratePerHour) {
        if (minutes == null || minutes <= 0) return null;
        return (minutes / 60.0) * ratePerHour;
    }

    private String resolveGradeKey(String grade) {
        if (grade == null) return "";
        String upper = grade.toUpperCase();
        if (upper.length() <= 3) return upper;
        return GRADE_ABBR.getOrDefault(upper, upper);
    }

    private Tariffication createTarifficationRecord(Long compilationId, ExtraCosts costs) {
        Tariffication tariffication = Tariffication.builder()
                .compilationId(compilationId)
                .tarifficationStatus(Tariffication.TarifficationStatus.TARIFFIED)
                .tariffiedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .sm1ExtraCost(costs.sm1())
                .sm2ExtraCost(costs.sm2())
                .totalExtraCost(costs.total())
                .build();

        return tarifficationRepository.save(tariffication);
    }
}