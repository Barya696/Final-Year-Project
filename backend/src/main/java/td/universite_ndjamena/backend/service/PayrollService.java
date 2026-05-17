package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import td.universite_ndjamena.backend.model.Payroll;
import td.universite_ndjamena.backend.repository.PayrollRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PayrollService {

    private final PayrollRepository payrollRepository;

    public List<Payroll> getAll() {
        return payrollRepository.findAll();
    }

    public Payroll create(Payroll incoming) {
        validate(incoming);
        Payroll payroll = Payroll.builder()
                .title(incoming.getTitle().trim())
                .semester(incoming.getSemester().trim())
                .hours(incoming.getHours())
                .rate(incoming.getRate())
                .build();
        return payrollRepository.save(payroll);
    }

    public Payroll update(Long id, Payroll incoming) {
        validate(incoming);
        Payroll current = payrollRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll row not found."));
        current.setTitle(incoming.getTitle().trim());
        current.setSemester(incoming.getSemester().trim());
        current.setHours(incoming.getHours());
        current.setRate(incoming.getRate());
        return payrollRepository.save(current);
    }

    public void delete(Long id) {
        if (!payrollRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll row not found.");
        }
        payrollRepository.deleteById(id);
    }

    private void validate(Payroll payroll) {
        if (payroll == null || payroll.getTitle() == null || payroll.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Payroll title is required.");
        }
        if (payroll.getSemester() == null || payroll.getSemester().trim().isEmpty()) {
            throw new IllegalArgumentException("Semester is required.");
        }
        if (payroll.getHours() == null || payroll.getHours() < 0) {
            throw new IllegalArgumentException("Hours must be greater than or equal to 0.");
        }
        if (payroll.getRate() == null || payroll.getRate() < 0) {
            throw new IllegalArgumentException("Rate must be greater than or equal to 0.");
        }
    }
}
