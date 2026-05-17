package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class LecturerService {

    private final LecturerRepository lecturerRepository;

    /**
     * Create a new lecturer
     */
    public Lecturer createLecturer(Lecturer lecturer) {
        return lecturerRepository.save(lecturer);
    }

    /**
     * Get lecturer by ID
     */
    public Optional<Lecturer> getLecturerById(Long id) {
        return lecturerRepository.findById(id);
    }

    /**
     * Get lecturer by lecturer name
     */
    public Optional<Lecturer> findByLecturerName(String lecturerName) {
        return lecturerRepository.findByLecturerName(lecturerName);
    }

    /**
     * Get all lecturers
     */
    public List<Lecturer> getAllLecturers() {
        return lecturerRepository.findAll();
    }

    /**
     * Get lecturers by department
     */
    public List<Lecturer> getLecturersByDepartment(String department) {
        return lecturerRepository.findByDepartment(department);
    }

    /**
     * Get lecturers by grade
     */
    public List<Lecturer> getLecturersByGrade(String grade) {
        return lecturerRepository.findByGrade(grade);
    }

    /**
     * Get lecturers by department and grade
     */
    public List<Lecturer> getLecturersByDepartmentAndGrade(String department, String grade) {
        return lecturerRepository.findByDepartmentAndGrade(department, grade);
    }

    /**
     * Update lecturer information
     */
    public Lecturer updateLecturer(Long id, Lecturer lecturerDetails) {
        Lecturer lecturer = lecturerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecturer not found with id: " + id));

        lecturer.setLecturerName(lecturerDetails.getLecturerName());
        lecturer.setGrade(lecturerDetails.getGrade());
        lecturer.setDepartment(lecturerDetails.getDepartment());

        return lecturerRepository.save(lecturer);
    }

    /**
     * Delete lecturer by ID
     */
    public void deleteLecturer(Long id) {
        if (!lecturerRepository.existsById(id)) {
            throw new IllegalArgumentException("Lecturer not found with id: " + id);
        }
        lecturerRepository.deleteById(id);
    }

    /**
     * Check if lecturer exists by ID
     */
    public boolean lecturerExists(Long id) {
        return lecturerRepository.existsById(id);
    }
}
