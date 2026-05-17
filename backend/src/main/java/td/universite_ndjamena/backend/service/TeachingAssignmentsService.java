package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.dto.TeachingAssignmentRequest;
import td.universite_ndjamena.backend.model.Course;
import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.model.TeachingAssignment;
import td.universite_ndjamena.backend.model.Timetable;
import td.universite_ndjamena.backend.repository.CourseRepository;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import td.universite_ndjamena.backend.repository.TeachingAssignmentsRepository;
import td.universite_ndjamena.backend.repository.TimetableRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TeachingAssignmentsService {

    private static final Comparator<TeachingAssignment> BY_DATE_THEN_ID = Comparator
            .comparing(TeachingAssignment::getAssignmentDate)
            .thenComparing(TeachingAssignment::getId);

    private final TeachingAssignmentsRepository teachingAssignmentsRepository;
    private final CourseRepository courseRepository;
    private final LecturerRepository lecturerRepository;
    private final TimetableRepository timetableRepository;

    public List<TeachingAssignment> findAll(String semester) {
        String sem = semester == null ? "" : semester.trim();
        if (sem.isEmpty()) {
            return teachingAssignmentsRepository.findAllByOrderByAssignmentDateDescIdDesc().stream()
                    .sorted(BY_DATE_THEN_ID)
                    .toList();
        }
        return teachingAssignmentsRepository.findBySemesterOrderByAssignmentDateAscIdAsc(sem);
    }

    public Optional<TeachingAssignment> findById(Long id) {
        return teachingAssignmentsRepository.findById(id);
    }

    @Transactional
    public TeachingAssignment create(TeachingAssignmentRequest req) {
        TeachingAssignment entity = buildFromRequest(req, null);
        return teachingAssignmentsRepository.save(entity);
    }

    @Transactional
    public TeachingAssignment update(Long id, TeachingAssignmentRequest req) {
        TeachingAssignment existing = teachingAssignmentsRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Teaching assignment not found with id: " + id));
        TeachingAssignment merged = buildFromRequest(req, existing);
        merged.setId(id);
        return teachingAssignmentsRepository.save(merged);
    }

    @Transactional
    public void delete(Long id) {
        if (!teachingAssignmentsRepository.existsById(id)) {
            throw new IllegalArgumentException("Teaching assignment not found with id: " + id);
        }
        teachingAssignmentsRepository.deleteById(id);
    }

    private TeachingAssignment buildFromRequest(TeachingAssignmentRequest req, TeachingAssignment existing) {
        if (req == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (req.getTimetableId() == null) {
            throw new IllegalArgumentException("timetableId is required");
        }
        if (req.getLecturerId() == null) {
            throw new IllegalArgumentException("lecturerId is required");
        }
        String type = req.getAssignmentType() == null ? "" : req.getAssignmentType().trim().toUpperCase();
        if (!"UEF".equals(type) && !"UT".equals(type)) {
            throw new IllegalArgumentException("assignmentType must be UEF or UT");
        }
        LocalDate assignmentDate;
        if (req.getAssignmentDate() == null || req.getAssignmentDate().isBlank()) {
            assignmentDate = LocalDate.now();
        } else {
            try {
                assignmentDate = LocalDate.parse(req.getAssignmentDate().trim());
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("assignmentDate must be yyyy-MM-dd");
            }
        }

        Timetable timetable = timetableRepository.findById(req.getTimetableId())
                .orElseThrow(() -> new IllegalArgumentException("Timetable not found with id: " + req.getTimetableId()));
        Course course = courseRepository.findById(timetable.getCourse().getId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + timetable.getCourse().getId()));
        Lecturer lecturer = lecturerRepository.findById(req.getLecturerId())
                .orElseThrow(() -> new IllegalArgumentException("Lecturer not found with id: " + req.getLecturerId()));

        String semesterRaw = req.getSemester() == null ? "" : req.getSemester().trim();
        if (semesterRaw.isEmpty()) {
            throw new IllegalArgumentException("semester is required (1 or 2)");
        }
        String semester;
        if ("1".equals(semesterRaw) || "SEMESTER 1".equalsIgnoreCase(semesterRaw)) {
            semester = "1";
        } else if ("2".equals(semesterRaw) || "SEMESTER 2".equalsIgnoreCase(semesterRaw)) {
            semester = "2";
        } else {
            throw new IllegalArgumentException("semester must be 1 or 2");
        }
        String group = req.getGroupCode() != null && !req.getGroupCode().isBlank()
                ? req.getGroupCode().trim()
                : timetable.getGroupCode();

        int durationMinutes = (timetable.getEndTime().toSecondOfDay() - timetable.getStartTime().toSecondOfDay()) / 60;
        Integer teachingHours = req.getTeachingHours() == null
                ? Math.max(1, (int) Math.ceil(durationMinutes / 60.0))
                : req.getTeachingHours();
        if (teachingHours < 1) {
            throw new IllegalArgumentException("teachingHours must be at least 1");
        }

        Integer chapterCount = req.getChapterCount() == null ? course.getChapters() : req.getChapterCount();
        if (chapterCount == null || chapterCount < 1) {
            throw new IllegalArgumentException("chapterCount must be at least 1");
        }

        TeachingAssignment.TeachingAssignmentBuilder b = TeachingAssignment.builder()
                .assignmentDate(assignmentDate)
                .course(course)
                .timetable(timetable)
                .lecturer(lecturer)
                .semester(semester)
                .assignmentType(type)
                .teachingHours(teachingHours)
                .groupCode(group)
                .chapterCount(chapterCount);

        if (existing != null) {
            b.createdAt(existing.getCreatedAt());
        }

        TeachingAssignment assignment = b.build();
        assertNoConflict(assignment, existing == null ? null : existing.getId());
        return assignment;
    }

    private static boolean overlaps(LocalTime s1, LocalTime e1, LocalTime s2, LocalTime e2) {
        return s1.isBefore(e2) && s2.isBefore(e1);
    }

    private void assertNoConflict(TeachingAssignment assignment, Long excludeId) {
        Timetable candidateSlot = assignment.getTimetable();
        List<TeachingAssignment> sameSemester = teachingAssignmentsRepository.findBySemester(assignment.getSemester());
        for (TeachingAssignment other : sameSemester) {
            if (Objects.equals(other.getId(), excludeId)) {
                continue;
            }
            Timetable otherSlot = other.getTimetable();
            if (otherSlot == null) {
                continue;
            }
            // Exact duplicate (redundancy): same timetable slot + same lecturer + same group
            if (Objects.equals(candidateSlot.getId(), otherSlot.getId())
                    && Objects.equals(assignment.getLecturer().getId(), other.getLecturer().getId())
                    && Objects.equals(
                            assignment.getGroupCode() == null ? "" : assignment.getGroupCode(),
                            other.getGroupCode() == null ? "" : other.getGroupCode()
                    )) {
                throw new IllegalArgumentException("Already assigned: this lecturer is already assigned to this slot/group");
            }
            if (candidateSlot.getDayOfWeek() != otherSlot.getDayOfWeek()) {
                continue;
            }
            boolean overlapsInTime = overlaps(
                    candidateSlot.getStartTime(), candidateSlot.getEndTime(),
                    otherSlot.getStartTime(), otherSlot.getEndTime()
            );
            if (!overlapsInTime) {
                continue;
            }

            // Rule: one lecturer cannot teach two things at the same time (regardless of course/group)
            if (Objects.equals(assignment.getLecturer().getId(), other.getLecturer().getId())) {
                throw new IllegalArgumentException("Conflict: this lecturer already has an assignment at that time");
            }

            // Rule: one course + one group at a given time must have only one lecturer
            boolean sameCourse = Objects.equals(assignment.getCourse().getId(), other.getCourse().getId());
            boolean sameGroup = Objects.equals(
                    assignment.getGroupCode() == null ? "" : assignment.getGroupCode(),
                    other.getGroupCode() == null ? "" : other.getGroupCode()
            );
            if (sameCourse && sameGroup) {
                throw new IllegalArgumentException("Conflict: this course is already assigned for that group at that time");
            }
        }
    }
}
