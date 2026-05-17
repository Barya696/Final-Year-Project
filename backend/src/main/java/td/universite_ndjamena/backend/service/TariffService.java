package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Tariff;
import td.universite_ndjamena.backend.repository.TariffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class TariffService {

    private static final List<String> ALLOWED_GRADES = List.of("A", "AU", "MA", "MC", "P", "PT");

    @Autowired
    private TariffRepository tariffRepository;

    public List<Tariff> getAll() {
        return tariffRepository.findAll();
    }

    public Tariff getById(Long id) {
        return tariffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tariff not found with ID: " + id));
    }

    public Optional<Tariff> getByGrade(String grade) {
        return tariffRepository.findByGradeIgnoreCase(normalizeGrade(grade));
    }

    public Tariff create(Tariff tariff) {
        validateTariff(tariff);
        if (tariffRepository.findByGradeIgnoreCase(tariff.getGrade()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tariff already exists for grade: " + tariff.getGrade());
        }
        return tariffRepository.save(tariff);
    }

    public Tariff update(Long id, Tariff tariff) {
        validateTariff(tariff);
        Tariff existing = getById(id);

        String normalizedGrade = tariff.getGrade();
        if (!existing.getGrade().equals(normalizedGrade)) {
            tariffRepository.findByGradeIgnoreCase(normalizedGrade)
                    .filter(it -> !it.getId().equals(id))
                    .ifPresent(it -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Another tariff already exists for grade: " + normalizedGrade);
                    });
        }

        existing.setGrade(normalizedGrade);
        existing.setRate(tariff.getRate());
        return tariffRepository.save(existing);
    }

    public void delete(Long id) {
        tariffRepository.deleteById(id);
    }

    private void validateTariff(Tariff tariff) {
        if (tariff == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tariff payload is required.");
        }

        if (tariff.getGrade() == null || tariff.getGrade().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tariff grade is required.");
        }

        tariff.setGrade(normalizeGrade(tariff.getGrade()));

        if (!ALLOWED_GRADES.contains(tariff.getGrade())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported tariff grade: " + tariff.getGrade());
        }

        if (tariff.getRate() == null || tariff.getRate() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tariff rate must be a non-negative number.");
        }
    }

    private String normalizeGrade(String grade) {
        return grade.trim().toUpperCase();
    }
}
