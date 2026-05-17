package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.dto.TimetableRequest;
import td.universite_ndjamena.backend.model.Course;
import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.model.Room;
import td.universite_ndjamena.backend.model.Timetable;
import td.universite_ndjamena.backend.repository.CourseRepository;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import td.universite_ndjamena.backend.repository.RoomRepository;
import td.universite_ndjamena.backend.repository.TimetableRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private static final Comparator<Timetable> BY_CALENDAR_ORDER = Comparator
            .comparing(Timetable::getSemester)
            .thenComparing(t -> t.getDayOfWeek().getValue())
            .thenComparing(Timetable::getStartTime);

    private final TimetableRepository timetableRepository;
    private final CourseRepository courseRepository;
    private final RoomRepository roomRepository;
    private final LecturerRepository lecturerRepository;

    public List<Timetable> findAll() {
        return timetableRepository.findAll().stream().sorted(BY_CALENDAR_ORDER).toList();
    }

    public List<Timetable> findBySemester(String semester) {
        String sem = semester == null ? "" : semester.trim();
        if (sem.isEmpty()) {
            return findAll();
        }
        return timetableRepository.findBySemester(sem).stream().sorted(BY_CALENDAR_ORDER).toList();
    }

    public Optional<Timetable> findById(Long id) {
        return timetableRepository.findById(id);
    }

    @Transactional
    public Timetable create(TimetableRequest req) {
        Timetable entity = buildFromRequest(req, null);
        assertNoOverlap(entity, null);
        return timetableRepository.save(entity);
    }

    @Transactional
    public Timetable update(Long id, TimetableRequest req) {
        Timetable existing = timetableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timetable not found with id: " + id));
        Timetable merged = buildFromRequest(req, existing);
        assertNoOverlap(merged, id);
        return timetableRepository.save(merged);
    }

    @Transactional
    public void delete(Long id) {
        if (!timetableRepository.existsById(id)) {
            throw new IllegalArgumentException("Timetable not found with id: " + id);
        }
        timetableRepository.deleteById(id);
    }

    private Timetable buildFromRequest(TimetableRequest req, Timetable existing) {
        if (req == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        String semester = req.getSemester() == null ? "" : req.getSemester().trim();
        if (semester.isEmpty()) {
            throw new IllegalArgumentException("Semester is required");
        }
        if (req.getDayOfWeek() == null || req.getDayOfWeek().isBlank()) {
            throw new IllegalArgumentException("dayOfWeek is required");
        }
        DayOfWeek day;
        try {
            day = DayOfWeek.valueOf(req.getDayOfWeek().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid dayOfWeek: use MONDAY … SUNDAY");
        }
        if (req.getCourseId() == null) {
            throw new IllegalArgumentException("courseId is required");
        }
        if (req.getRoomId() == null) {
            throw new IllegalArgumentException("roomId is required");
        }
        LocalTime start;
        LocalTime end;
        try {
            start = LocalTime.parse(req.getStartTime().trim());
            end = LocalTime.parse(req.getEndTime().trim());
        } catch (NullPointerException | DateTimeParseException e) {
            throw new IllegalArgumentException("startTime and endTime are required as HH:mm");
        }
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("endTime must be after startTime");
        }

        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + req.getCourseId()));
        Room room = roomRepository.findById(req.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Room not found with id: " + req.getRoomId()));

        Lecturer lecturer = null;
        if (req.getLecturerId() != null) {
            lecturer = lecturerRepository.findById(req.getLecturerId())
                    .orElseThrow(() -> new IllegalArgumentException("Lecturer not found with id: " + req.getLecturerId()));
        }

        Timetable.TimetableBuilder b = Timetable.builder()
                .semester(semester)
                .dayOfWeek(day)
                .course(course)
                .room(room)
                .lecturer(lecturer)
                .startTime(start)
                .endTime(end)
                .groupCode(req.getGroupCode() != null && !req.getGroupCode().isBlank() ? req.getGroupCode().trim() : null);

        if (existing != null) {
            b.id(existing.getId()).createdAt(existing.getCreatedAt());
        }

        return b.build();
    }

    /** Two intervals [start, end) style overlap if strictly overlapping in time (touching endpoints allowed). */
    private static boolean overlaps(LocalTime s1, LocalTime e1, LocalTime s2, LocalTime e2) {
        return s1.isBefore(e2) && s2.isBefore(e1);
    }

    private void assertNoOverlap(Timetable slot, Long excludeId) {
        List<Timetable> sameRoom = timetableRepository.findBySemesterAndRoom_IdAndDayOfWeek(
                slot.getSemester(), slot.getRoom().getId(), slot.getDayOfWeek());
        for (Timetable other : sameRoom) {
            if (Objects.equals(other.getId(), excludeId)) {
                continue;
            }
            if (overlaps(slot.getStartTime(), slot.getEndTime(), other.getStartTime(), other.getEndTime())) {
                throw new IllegalArgumentException("Room is already booked for this day and time slot");
            }
        }

        if (slot.getLecturer() != null) {
            List<Timetable> sameLecturer = timetableRepository.findBySemesterAndLecturer_IdAndDayOfWeek(
                    slot.getSemester(), slot.getLecturer().getId(), slot.getDayOfWeek());
            for (Timetable other : sameLecturer) {
                if (Objects.equals(other.getId(), excludeId)) {
                    continue;
                }
                if (overlaps(slot.getStartTime(), slot.getEndTime(), other.getStartTime(), other.getEndTime())) {
                    throw new IllegalArgumentException("Lecturer already has another class at this time");
                }
            }
        }
    }
}
