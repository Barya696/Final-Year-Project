package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Department;
import td.universite_ndjamena.backend.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    /**
     * Create a new department
     */
    public Department createDepartment(Department department) {
        if (departmentRepository.existsByDepartmentName(department.getDepartmentName())) {
            throw new IllegalArgumentException("Department name already exists: " + department.getDepartmentName());
        }
        
        return departmentRepository.save(department);
    }

    /**
     * Get department by ID
     */
    public Optional<Department> getDepartmentById(Long id) {
        return departmentRepository.findById(id);
    }

    /**
     * Get department by name
     */
    public Optional<Department> getDepartmentByName(String departmentName) {
        return departmentRepository.findByDepartmentName(departmentName);
    }

    /**
     * Get all departments
     */
    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    /**
     * Get departments by HOD
     */
    public List<Department> getDepartmentsByHod(String hod) {
        return departmentRepository.findByHod(hod);
    }

    /**
     * Update department information
     */
    public Department updateDepartment(Long id, Department departmentDetails) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Department not found with id: " + id));

        // Check if new name exists (if changed)
        if (!department.getDepartmentName().equals(departmentDetails.getDepartmentName()) && 
            departmentRepository.existsByDepartmentName(departmentDetails.getDepartmentName())) {
            throw new IllegalArgumentException("Department name already exists: " + departmentDetails.getDepartmentName());
        }

        department.setDepartmentName(departmentDetails.getDepartmentName());
        department.setHod(departmentDetails.getHod());
        department.setNumberOfLecturers(departmentDetails.getNumberOfLecturers());

        return departmentRepository.save(department);
    }

    /**
     * Delete department by ID
     */
    public void deleteDepartment(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new IllegalArgumentException("Department not found with id: " + id);
        }
        departmentRepository.deleteById(id);
    }

    /**
     * Check if department exists by ID
     */
    public boolean departmentExists(Long id) {
        return departmentRepository.existsById(id);
    }
}
