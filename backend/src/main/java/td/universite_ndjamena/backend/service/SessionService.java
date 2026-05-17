package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Session;
import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.model.Course;
import td.universite_ndjamena.backend.model.Department;
import td.universite_ndjamena.backend.repository.SessionRepository;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import td.universite_ndjamena.backend.repository.CourseRepository;
import td.universite_ndjamena.backend.repository.DepartmentRepository;
import td.universite_ndjamena.backend.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SessionService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private LecturerRepository lecturerRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UsersRepository usersRepository;

    public Optional<Long> findHodDepartmentIdByUserId(Long userId) {
        return usersRepository.findDepartmentIdByUserId(userId);
    }

    public List<Session> getAllSessions(Long departmentId) {
        if (departmentId == null) {
            return sessionRepository.findAllSessionsWithLecturer();
        }
        return sessionRepository.findAllSessionsWithLecturerByDepartmentId(departmentId);
    }

    @Transactional(readOnly = true)
    public Optional<Session> getSessionById(Long id) {
        return sessionRepository.findById(id);
    }

    public List<Session> getSessionsByLecturerName(String lecturerName, Long departmentId) {
        if (departmentId == null) {
            return sessionRepository.findSessionsByLecturerName(lecturerName);
        }
        return sessionRepository.findSessionsByLecturerNameAndDepartmentId(lecturerName, departmentId);
    }

    public List<Session> getSessionsBySemester(String semester, Long departmentId) {
        if (departmentId == null) {
            return sessionRepository.findSessionsBySemester(semester);
        }
        return sessionRepository.findSessionsBySemesterAndDepartmentId(semester, departmentId);
    }

    /**
     * Academic session report: optional lecturer (all if null), optional semester (all if blank),
     * optional department (all if null).
     */
    public List<Session> getSessionsForReport(Long lecturerId, String semester, Long departmentId) {
        String sem = semester == null ? "" : semester.trim();
        boolean allSemesters = sem.isEmpty();
        boolean allLecturers = lecturerId == null;

        List<Session> rows;
        if (allLecturers && allSemesters) {
            rows = getAllSessions(departmentId);
        } else if (allLecturers) {
            rows = getSessionsBySemester(sem, departmentId);
        } else if (allSemesters) {
            if (departmentId == null) {
                rows = sessionRepository.findSessionsByLecturerIdWithDetails(lecturerId);
            } else {
                rows = sessionRepository.findSessionsByLecturerIdAndDepartmentIdWithDetails(lecturerId, departmentId);
            }
        } else {
            if (departmentId == null) {
                rows = sessionRepository.findSessionsByLecturerIdAndSemesterWithDetails(lecturerId, sem);
            } else {
                rows = sessionRepository.findSessionsByLecturerIdAndSemesterAndDepartmentIdWithDetails(
                        lecturerId, sem, departmentId);
            }
        }
        return rows.stream()
                .sorted(Comparator.comparing(Session::getSessionDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    private static String csvEscape(String value) {
        if (value == null) {
            return "";
        }
        String v = value.replace("\"", "\"\"");
        if (v.contains(",") || v.contains("\n") || v.contains("\"") || v.contains("\r")) {
            return "\"" + v + "\"";
        }
        return v;
    }

    public byte[] buildSessionsReportCsv(List<Session> sessions) {
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Lecturer,Course,Course Code,Semester,Session Date,Start,End,Duration (hours),Group,Type,Chapters\n");
        for (Session s : sessions) {
            int minutes = s.getSessionMinutes() != null ? s.getSessionMinutes() : 0;
            double hours = minutes / 60.0;
            String lecturerName = s.getLecturerName() != null ? s.getLecturerName() : "";
            String courseName = s.getCourseName() != null ? s.getCourseName() : "";
            String code = s.getCourseCode() != null ? s.getCourseCode() : "";
            String semester = Objects.toString(s.getSemester(), "");
            String dateStr = s.getSessionDate() != null ? s.getSessionDate().toString() : "";
            String start = s.getStartTime() != null ? timeFmt.format(s.getStartTime()) : "";
            String end = s.getEndTime() != null ? timeFmt.format(s.getEndTime()) : "";
            String group = s.getGroupCode() != null ? s.getGroupCode() : "";
            String type = s.getSessionType() != null ? s.getSessionType() : "";
            String chapters = s.getChapters() != null ? s.getChapters().toString() : "";

            sb.append(csvEscape(lecturerName)).append(',');
            sb.append(csvEscape(courseName)).append(',');
            sb.append(csvEscape(code)).append(',');
            sb.append(csvEscape(semester)).append(',');
            sb.append(csvEscape(dateStr)).append(',');
            sb.append(csvEscape(start)).append(',');
            sb.append(csvEscape(end)).append(',');
            sb.append(String.format(java.util.Locale.US, "%.2f", hours)).append(',');
            sb.append(csvEscape(group)).append(',');
            sb.append(csvEscape(type)).append(',');
            sb.append(chapters).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public Session createSession(Session session) {
        if (session.getLecturer() != null && session.getLecturer().getId() != null) {
            Optional<Lecturer> lecturer = lecturerRepository.findById(session.getLecturer().getId());
            lecturer.ifPresent(session::setLecturer);
        } else if (session.getLecturer() != null && session.getLecturer().getLecturerName() != null) {
            Optional<Lecturer> lecturer = lecturerRepository.findByLecturerName(session.getLecturer().getLecturerName());
            lecturer.ifPresent(session::setLecturer);
        }

        if (session.getCourse() != null && session.getCourse().getId() != null) {
            Optional<Course> course = courseRepository.findById(session.getCourse().getId());
            course.ifPresent(session::setCourse);
        }
        return sessionRepository.save(session);
    }

    public Session createSession(Session session, Long lecturerId) {
        if (lecturerId != null) {
            Optional<Lecturer> lecturer = lecturerRepository.findById(lecturerId);
            if (lecturer.isPresent()) {
                session.setLecturer(lecturer.get());
            } else {
                throw new IllegalArgumentException("Lecturer not found with ID: " + lecturerId);
            }
        } else {
            throw new IllegalArgumentException("Lecturer ID is required");
        }
        return sessionRepository.save(session);
    }

    @Transactional
    public Session createSession(Session session, Long lecturerId, Long courseId, Long departmentId) {
        if (lecturerId != null) {
            Optional<Lecturer> lecturer = lecturerRepository.findById(lecturerId);
            if (lecturer.isPresent()) {
                session.setLecturer(lecturer.get());
            } else {
                throw new IllegalArgumentException("Lecturer not found with ID: " + lecturerId);
            }
        } else {
            throw new IllegalArgumentException("Lecturer ID is required");
        }

        if (courseId != null) {
            Optional<Course> course = courseRepository.findById(courseId);
            if (course.isPresent()) {
                session.setCourse(course.get());
            } else {
                throw new IllegalArgumentException("Course not found with ID: " + courseId);
            }
        } else {
            throw new IllegalArgumentException("Course ID is required");
        }

        if (departmentId != null) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Department not found with ID: " + departmentId));
            session.setHodDepartment(department);
        }

        return sessionRepository.save(session);
    }

    @Transactional
    public Session updateSession(Long id, Session sessionDetails) {
        Optional<Session> session = sessionRepository.findById(id);
        if (session.isPresent()) {
            Session existingSession = session.get();

            if (sessionDetails.getCourse() != null && sessionDetails.getCourse().getId() != null) {
                Optional<Course> course = courseRepository.findById(sessionDetails.getCourse().getId());
                course.ifPresent(existingSession::setCourse);
            }

            existingSession.setStartTime(sessionDetails.getStartTime());
            existingSession.setEndTime(sessionDetails.getEndTime());
            existingSession.setGroupCode(sessionDetails.getGroupCode());
            existingSession.setSessionType(sessionDetails.getSessionType());
            existingSession.setChapters(sessionDetails.getChapters());
            existingSession.setSessionDate(sessionDetails.getSessionDate());
            existingSession.setSemester(sessionDetails.getSemester());

            if (sessionDetails.getLecturer() != null) {
                if (sessionDetails.getLecturer().getId() != null) {
                    Optional<Lecturer> lecturer = lecturerRepository.findById(sessionDetails.getLecturer().getId());
                    lecturer.ifPresent(existingSession::setLecturer);
                } else if (sessionDetails.getLecturer().getLecturerName() != null) {
                    Optional<Lecturer> lecturer = lecturerRepository.findByLecturerName(
                            sessionDetails.getLecturer().getLecturerName());
                    lecturer.ifPresent(existingSession::setLecturer);
                }
            }

            return sessionRepository.save(existingSession);
        }
        throw new RuntimeException("Session not found");
    }

    public void deleteSession(Long id) {
        sessionRepository.deleteById(id);
    }
}
