package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Classification;
import td.universite_ndjamena.backend.model.Compilation;
import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.model.Required;
import td.universite_ndjamena.backend.repository.ClassificationRepository;
import td.universite_ndjamena.backend.repository.CompilationRepository;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import td.universite_ndjamena.backend.repository.RequiredRepository;
import td.universite_ndjamena.backend.repository.TarifficationRepository;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;

@Service
public class CompilationService {

    @Autowired private CompilationRepository compilationRepository;
    @Autowired private ClassificationRepository classificationRepository;
    @Autowired private LecturerRepository lecturerRepository;
    @Autowired private TarifficationRepository tarifficationRepository;
    @Autowired private RequiredRepository requiredRepository;

    private static final int FALLBACK_ANNUAL_HOURS = 200;

    private static final Map<String, Integer> ANNUAL_HOURS_BY_KEY = Map.ofEntries(
            Map.entry("A", 200),
            Map.entry("AU", 200),
            Map.entry("MA", 200),
            Map.entry("MC", 180),
            Map.entry("P", 160),
            Map.entry("PT", 160)
    );

    private static final Map<String, String> GRADE_TO_KEY = Map.ofEntries(
            Map.entry("ASSISTANT", "A"),
            Map.entry("ATTACHE_UNIVERSITAIRE", "AU"),
            Map.entry("ATTACHE", "AU"),
            Map.entry("MAITRE_ASSISTANT", "MA"),
            Map.entry("MAITRE_CONFERENCE", "MC"),
            Map.entry("PROFESSEUR", "P"),
            Map.entry("PROFESSOR", "P"),
            Map.entry("PROFESSEUR_TITULAIRE", "PT")
    );

    /** Same rule as frontend Classified page: semester regulatory volume in minutes. */
    private int semesterRequiredMinutes(Lecturer lecturer) {
        int annualDefault = annualDefaultHoursFromGrade(lecturer.getGrade());
        int additive = requiredRepository.findByLecturerId(lecturer.getId())
                .map(Required::getRequiredHours)
                .orElse(0);
        int annualHours = annualDefault + additive;
        return (int) Math.round((annualHours / 2.0) * 60.0);
    }

    private static int annualDefaultHoursFromGrade(String grade) {
        if (grade == null || grade.isBlank()) {
            return FALLBACK_ANNUAL_HOURS;
        }
        String upper = grade.trim().toUpperCase();
        String key = upper.length() <= 3 ? upper : GRADE_TO_KEY.get(upper);
        if (key == null) {
            return FALLBACK_ANNUAL_HOURS;
        }
        return ANNUAL_HOURS_BY_KEY.getOrDefault(key, FALLBACK_ANNUAL_HOURS);
    }

    public List<Compilation> getAll() {
        return compilationRepository.findAll();
    }

    public Optional<Compilation> getById(Long id) {
        return compilationRepository.findById(id);
    }

    public List<Compilation> getByLecturerId(Long lecturerId) {
        return compilationRepository.findByLecturerId(lecturerId);
    }

    public Compilation compileByLecturerId(Long lecturerId) {

        // 1. Guard: already compiled
        if (compilationRepository.existsByLecturerId(lecturerId)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Compilation already exists for lecturer ID: " + lecturerId
            );
        }

        // 2. Verify lecturer exists
        Lecturer lecturer = lecturerRepository.findById(lecturerId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Lecturer not found with ID: " + lecturerId
                ));

        // 3. Fetch classifications for this lecturer
        List<Classification> records =
                classificationRepository.findByLecturerId(lecturerId);

        System.out.println(">>> Found " + records.size() + " classification records for lecturer " + lecturerId);
        records.forEach(r -> System.out.println("    semester=" + r.getSemester()
                + " dept=" + r.getDepartmentIdValue()));

        Classification s1 = records.stream()
                .filter(c -> "1".equals(c.getSemester()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing semester 1 classification for lecturer: "
                        + lecturer.getLecturerName()
                ));

        Classification s2 = records.stream()
                .filter(c -> "2".equals(c.getSemester()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing semester 2 classification for lecturer: "
                        + lecturer.getLecturerName()
                ));

        // 4. Resolve departmentId — null-safe
        Long departmentId = s1.getDepartmentIdValue();
        if (departmentId == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Semester 1 classification has no department set for lecturer: "
                    + lecturer.getLecturerName()
            );
        }

        // 5. Compute weighted totals (fold session totals into core when core/elective were never set)
        int s1CoreCm = foldUnassignedIntoCore(s1.getCmHour(), s1.getCoreCm(), s1.getElectiveCm());
        int s1CoreTd = foldUnassignedIntoCore(s1.getTdHour(), s1.getCoreTd(), s1.getElectiveTd());
        int s1CoreTp = foldUnassignedIntoCore(s1.getTpHour(), s1.getCoreTp(), s1.getElectiveTp());
        int s2CoreCm = foldUnassignedIntoCore(s2.getCmHour(), s2.getCoreCm(), s2.getElectiveCm());
        int s2CoreTd = foldUnassignedIntoCore(s2.getTdHour(), s2.getCoreTd(), s2.getElectiveTd());
        int s2CoreTp = foldUnassignedIntoCore(s2.getTpHour(), s2.getCoreTp(), s2.getElectiveTp());

        int s1Weighted = computeWeightedTotal(
                s1CoreCm, s1CoreTd, s1CoreTp,
                nz(s1.getElectiveCm()), nz(s1.getElectiveTd()), nz(s1.getElectiveTp())
        );
        int s2Weighted = computeWeightedTotal(
                s2CoreCm, s2CoreTd, s2CoreTp,
                nz(s2.getElectiveCm()), nz(s2.getElectiveTd()), nz(s2.getElectiveTp())
        );

        System.out.println(">>> s1Weighted=" + s1Weighted + " s2Weighted=" + s2Weighted);

        int semesterRequiredMin = semesterRequiredMinutes(lecturer);

        // 6. Build and save
        Compilation compilation = Compilation.builder()
                .lecturerId(lecturerId)
                .departmentId(departmentId)
                .s1CoreCm(s1CoreCm)
                .s1CoreTd(s1CoreTd)
                .s1CoreTp(s1CoreTp)
                .s1ElectiveCm(s1.getElectiveCm())
                .s1ElectiveTd(s1.getElectiveTd())
                .s1ElectiveTp(s1.getElectiveTp())
                .s1WeightedTotal(s1Weighted)
                .s1Required(semesterRequiredMin)
                .s1Extra(s1Weighted - semesterRequiredMin)
                .s2CoreCm(s2CoreCm)
                .s2CoreTd(s2CoreTd)
                .s2CoreTp(s2CoreTp)
                .s2ElectiveCm(s2.getElectiveCm())
                .s2ElectiveTd(s2.getElectiveTd())
                .s2ElectiveTp(s2.getElectiveTp())
                .s2WeightedTotal(s2Weighted)
                .s2Required(semesterRequiredMin)
                .s2Extra(s2Weighted - semesterRequiredMin)
                .combinedTotal(s1Weighted + s2Weighted)
                .combinedExtra((s1Weighted + s2Weighted) - (semesterRequiredMin * 2))
                .build();

        return compilationRepository.save(compilation);
    }

    private static int nz(Integer n) {
        return n == null ? 0 : n;
    }

    /** Minutes in aggregate (cm/td/tp) but not in core+elective — treat as core (matches ClassificationService). */
    private static int foldUnassignedIntoCore(Integer aggregate, Integer core, Integer elective) {
        int a = nz(aggregate);
        int c = nz(core);
        int e = nz(elective);
        int u = a - c - e;
        return u > 0 ? c + u : c;
    }

    private int computeWeightedTotal(int coreCm, int coreTd, int coreTp,
                                      int electiveCm, int electiveTd, int electiveTp) {
        float total = (coreCm * 1.5f) + coreTd + coreTp
                    + (electiveCm * 1.5f) + electiveTd + electiveTp;
        return Math.round(total);
    }

    public Compilation updateCompilation(Long id, Compilation incoming) {
        Compilation comp = compilationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Compilation not found"));
        if (incoming.getLecturerId() != null)  comp.setLecturerId(incoming.getLecturerId());
        if (incoming.getDepartmentId() != null) comp.setDepartmentId(incoming.getDepartmentId());
        return compilationRepository.save(comp);
    }

    @Transactional
    public void deleteCompilation(Long id) {
        Compilation compilation = compilationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Compilation not found with ID: " + id));
        if (compilation.getTarifficationStatus() == Compilation.TarifficationStatus.TARIFFIED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot delete a compilation that is already tariffied.");
        }
        tarifficationRepository.findByCompilationId(id).ifPresent(tarifficationRepository::delete);
        compilationRepository.deleteById(id);
    }
}