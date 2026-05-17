package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Course;
import td.universite_ndjamena.backend.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;

    /**
     * Create a new course
     */
    public Course createCourse(Course course) {
        if (courseRepository.existsByCode(course.getCode())) {
            throw new IllegalArgumentException("Course code already exists: " + course.getCode());
        }
        
        return courseRepository.save(course);
    }

    /**
     * Get course by ID
     */
    public Optional<Course> getCourseById(Long id) {
        return courseRepository.findById(id);
    }

    /**
     * Get course by code
     */
    public Optional<Course> getCourseByCode(String code) {
        return courseRepository.findByCode(code);
    }

    /**
     * Get course by course name
     */
    public Optional<Course> getCourseByCourseName(String courseName) {
        return courseRepository.findByCourseName(courseName);
    }

    /**
     * Get all courses
     */
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    /**
     * Get courses by department
     */
    public List<Course> getCoursesByDepartment(String department) {
        return courseRepository.findByDepartment(department);
    }

    /**
     * Get courses by chapters
     */
    public List<Course> getCoursesByChapters(Integer chapters) {
        return courseRepository.findByChapters(chapters);
    }

    /**
     * Update course information
     */
    public Course updateCourse(Long id, Course courseDetails) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + id));

        // Check if new code exists (if changed)
        if (!course.getCode().equals(courseDetails.getCode()) && 
            courseRepository.existsByCode(courseDetails.getCode())) {
            throw new IllegalArgumentException("Course code already exists: " + courseDetails.getCode());
        }

        course.setCourseName(courseDetails.getCourseName());
        course.setCode(courseDetails.getCode());
        course.setChapters(courseDetails.getChapters());
        course.setDepartment(courseDetails.getDepartment());

        return courseRepository.save(course);
    }

    /**
     * Delete course by ID
     */
    public void deleteCourse(Long id) {
        if (!courseRepository.existsById(id)) {
            throw new IllegalArgumentException("Course not found with id: " + id);
        }
        courseRepository.deleteById(id);
    }

    /**
     * Check if course exists by ID
     */
    public boolean courseExists(Long id) {
        return courseRepository.existsById(id);
    }
}
