package td.universite_ndjamena.backend.service;

import td.universite_ndjamena.backend.model.Classification;
import td.universite_ndjamena.backend.model.Department;
import td.universite_ndjamena.backend.model.Lecturer;
import td.universite_ndjamena.backend.model.Notification;
import td.universite_ndjamena.backend.model.Session;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.repository.ClassificationRepository;
import td.universite_ndjamena.backend.repository.CourseRepository;
import td.universite_ndjamena.backend.repository.DepartmentRepository;
import td.universite_ndjamena.backend.repository.GroupRepository;
import td.universite_ndjamena.backend.repository.LecturerRepository;
import td.universite_ndjamena.backend.repository.SessionRepository;
import td.universite_ndjamena.backend.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class ClassificationService {

    @Autowired private ClassificationRepository classificationRepository;
    @Autowired private LecturerRepository       lecturerRepository;
    @Autowired private CourseRepository         courseRepository;
    @Autowired private GroupRepository          groupRepository;
    @Autowired private DepartmentRepository     departmentRepository;  // ← was UsersRepository
    @Autowired private SessionRepository        sessionRepository;
    @Autowired private UsersRepository           usersRepository;
    @Autowired private NotificationService       notificationService;

    public List<Classification> getAllClassifications(Long departmentIdFilter) {
        if (departmentIdFilter == null) {
            return classificationRepository.findAllClassifications();
        }
        return classificationRepository.findByDepartmentId(departmentIdFilter);
    }

    public Optional<Classification> getClassificationById(Long id) {
        return classificationRepository.findById(id);
    }

    public List<Classification> getClassificationsByLecturerAndSemester(
            Long lecturerId, String semester, Long departmentIdFilter) {
        if (departmentIdFilter == null) {
            return classificationRepository.findByLecturerAndSemester(lecturerId, semester);
        }
        return classificationRepository.findByLecturerAndSemesterAndDepartmentId(lecturerId, semester, departmentIdFilter);
    }

    public List<Classification> getClassificationsBySemester(String semester, Long departmentIdFilter) {
        if (departmentIdFilter == null) {
            return classificationRepository.findBySemester(semester);
        }
        return classificationRepository.findBySemesterAndDepartmentId(semester, departmentIdFilter);
    }

    public List<Classification> getClassificationsByStatus(
            Classification.ClassificationStatus status, Long departmentIdFilter) {
        if (departmentIdFilter == null) {
            return classificationRepository.findByStatus(status);
        }
        return classificationRepository.findByStatusAndDepartmentId(status, departmentIdFilter);
    }

    public List<Classification> getClassificationsByLecturerId(Long lecturerId, Long departmentIdFilter) {
        if (departmentIdFilter == null) {
            return classificationRepository.findByLecturerId(lecturerId);
        }
        return classificationRepository.findByLecturerIdAndDepartmentId(lecturerId, departmentIdFilter);
    }

    public List<Classification> getClassificationsByCourseId(Long courseId, Long departmentIdFilter) {
        String idStr = String.valueOf(courseId);
        if (departmentIdFilter == null) {
            return classificationRepository.findByCourseId(idStr);
        }
        return classificationRepository.findByCourseIdAndDepartmentId(idStr, departmentIdFilter);
    }

    public List<Classification> getClassificationsByGroupId(Long groupId, Long departmentIdFilter) {
        String idStr = String.valueOf(groupId);
        if (departmentIdFilter == null) {
            return classificationRepository.findByGroupId(idStr);
        }
        return classificationRepository.findByGroupIdAndDepartmentId(idStr, departmentIdFilter);
    }

    public List<Classification> getClassificationsByDepartmentId(Long departmentId) {
        return classificationRepository.findByDepartmentId(departmentId);
    }

    public Classification createClassification(Classification classification, Long lecturerId,
            String courseIds, String groupIds, Long departmentId, String sessionIds) {

        // Lecturer
        Lecturer lecturer = lecturerRepository.findById(lecturerId)
                .orElseThrow(() -> new IllegalArgumentException("Lecturer not found with ID: " + lecturerId));
        classification.setLecturer(lecturer);

        // Courses
        if (courseIds == null || courseIds.isBlank())
            throw new IllegalArgumentException("Course ID is required");
        for (String idStr : courseIds.split(",")) {
            Long cid = Long.parseLong(idStr.trim());
            if (!courseRepository.existsById(cid))
                throw new IllegalArgumentException("Course not found with ID: " + cid);
        }
        classification.setCourseIds(courseIds);

        // Groups
        if (groupIds == null || groupIds.isBlank())
            throw new IllegalArgumentException("Group ID is required");
        for (String idStr : groupIds.split(",")) {
            Long gid = Long.parseLong(idStr.trim());
            if (!groupRepository.existsById(gid))
                throw new IllegalArgumentException("Group not found with ID: " + gid);
        }
        classification.setGroupIds(groupIds);

        // Sessions (optional)
        if (sessionIds != null && !sessionIds.isBlank()) {
            for (String idStr : sessionIds.split(",")) {
                Long sid = Long.parseLong(idStr.trim());
                if (!sessionRepository.existsById(sid))
                    throw new IllegalArgumentException("Session not found with ID: " + sid);
            }
            classification.setSessionIds(sessionIds);
            applyHoursFromSessions(classification, sessionIds);
        }

        // Department — now from the real departments table
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Department not found with ID: " + departmentId));
        classification.setDepartment(department);

        // Duplicate check (per department)
        classificationRepository.findExisting(lecturerId, classification.getSemester(), courseIds, groupIds, departmentId)
                .ifPresent(e -> { throw new IllegalArgumentException(
                    "Classification already exists for this lecturer, semester, course, group, and department"); });

        return classificationRepository.save(classification);
    }

    public Classification updateClassification(Long id, Classification details) {
        Classification existing = classificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Classification not found"));

        if (details.getCmHour()           != null) existing.setCmHour(details.getCmHour());
        if (details.getTdHour()           != null) existing.setTdHour(details.getTdHour());
        if (details.getTpHour()           != null) existing.setTpHour(details.getTpHour());
        if (details.getCoreCm()           != null) existing.setCoreCm(details.getCoreCm());
        if (details.getCoreTd()           != null) existing.setCoreTd(details.getCoreTd());
        if (details.getCoreTp()           != null) existing.setCoreTp(details.getCoreTp());
        if (details.getElectiveCm()       != null) existing.setElectiveCm(details.getElectiveCm());
        if (details.getElectiveTd()       != null) existing.setElectiveTd(details.getElectiveTd());
        if (details.getElectiveTp()       != null) existing.setElectiveTp(details.getElectiveTp());
        if (details.getClassifiedStatus() != null) existing.setClassifiedStatus(details.getClassifiedStatus());

        return classificationRepository.save(existing);
    }

    public void deleteClassification(Long id) {
        classificationRepository.deleteById(id);
    }

    /**
     * Notifies the department HOD that a lecturer is missing a semester classification
     * (so they can create the missing semester entry / sessions).
     */
    public int notifyHodMissingSemester(Long lecturerId, String semester, Long requesterUserId) {
        if (!"1".equals(semester) && !"2".equals(semester)) {
            throw new IllegalArgumentException("semester must be \"1\" or \"2\"");
        }

        Lecturer lecturer = lecturerRepository.findById(lecturerId)
                .orElseThrow(() -> new IllegalArgumentException("Lecturer not found with ID: " + lecturerId));

        List<Classification> existing = classificationRepository.findByLecturerId(lecturerId);
        Long departmentId = null;
        String departmentName = lecturer.getDepartment();
        for (Classification c : existing) {
            if (c.getDepartment() != null) {
                departmentId = c.getDepartment().getId();
                departmentName = c.getDepartment().getDepartmentName();
                break;
            }
        }
        if (departmentId == null) {
            Department d = departmentRepository.findByDepartmentName(lecturer.getDepartment())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Cannot resolve department for lecturer (no classification department and name mismatch): "
                                    + lecturer.getDepartment()));
            departmentId = d.getId();
            departmentName = d.getDepartmentName();
        }

        Set<Long> notifiedIds = new LinkedHashSet<>();
        List<Users> byDept = usersRepository.findByRoleAndDepartment_Id(Users.UserRole.HOD, departmentId);
        for (Users u : byDept) {
            if (u.getStatus() == Users.UserStatus.ACTIVE) {
                notifiedIds.add(u.getId());
            }
        }

        if (notifiedIds.isEmpty()) {
            Department dept = departmentRepository.findById(departmentId).orElse(null);
            if (dept != null && dept.getHod() != null && !dept.getHod().isBlank()) {
                usersRepository.findFirstByNameIgnoreCaseAndRoleAndStatus(
                                dept.getHod().trim(),
                                Users.UserRole.HOD,
                                Users.UserStatus.ACTIVE)
                        .ifPresent(u -> notifiedIds.add(u.getId()));
            }
        }

        if (notifiedIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "No active Head of Department user found for \"" + departmentName
                            + "\". Assign an HOD user with role HOD linked to this department, "
                            + "or ensure the department HOD name matches a user account.");
        }

        String title = "Classification — Semester " + semester + " requested";
        String message = lecturer.getLecturerName()
                + " (lecturer ID " + lecturerId + ") needs Semester " + semester
                + " classification data in department \"" + departmentName
                + "\" so their workload can be completed and compiled. Please add the missing semester.";

        for (Long recipientId : notifiedIds) {
            notificationService.createNotification(
                    recipientId,
                    requesterUserId,
                    title,
                    message,
                    Notification.NotificationPriority.MEDIUM,
                    Notification.NotificationEventType.REQUEST_SEMESTER_PENDING
            );
        }

        return notifiedIds.size();
    }

    public Classification recalculateHoursFromSessions(Long classificationId) {
        Classification c = classificationRepository.findById(classificationId)
                .orElseThrow(() -> new RuntimeException("Classification not found"));
        String sessionIds = c.getSessionIds();
        if (sessionIds == null || sessionIds.isBlank())
            throw new RuntimeException("No sessions linked to this classification");
        applyHoursFromSessions(c, sessionIds);
        return classificationRepository.save(c);
    }

    private void applyHoursFromSessions(Classification classification, String sessionIds) {
        int cmTotal = 0, tdTotal = 0, tpTotal = 0;
        int coreCm = 0, coreTd = 0, coreTp = 0;
        int electiveCm = 0, electiveTd = 0, electiveTp = 0;

        for (Long sessionId : parseIds(sessionIds)) {
            Optional<Session> opt = sessionRepository.findById(sessionId);
            if (opt.isEmpty()) continue;

            Session s = opt.get();
            int minutes   = s.getSessionMinutes() != null ? s.getSessionMinutes() : 0;
            String type   = s.getSessionType()    != null ? s.getSessionType().trim().toUpperCase() : "";
            String cType  = (s.getCourse() != null && s.getCourse().getCourseType() != null)
                            ? s.getCourse().getCourseType().trim().toLowerCase() : "";

            switch (type) {
                case "CM" -> { cmTotal += minutes;
                    if ("core".equals(cType)) coreCm += minutes;
                    else if ("elective".equals(cType)) electiveCm += minutes; }
                case "TD" -> { tdTotal += minutes;
                    if ("core".equals(cType)) coreTd += minutes;
                    else if ("elective".equals(cType)) electiveTd += minutes; }
                case "TP" -> { tpTotal += minutes;
                    if ("core".equals(cType)) coreTp += minutes;
                    else if ("elective".equals(cType)) electiveTp += minutes; }
            }
        }

        /* Minutes counted in totals but not tagged core/elective (null/unknown course type) — attribute to core so UI & compile match aggregates */
        int unassignedCm = cmTotal - coreCm - electiveCm;
        if (unassignedCm > 0) coreCm += unassignedCm;
        int unassignedTd = tdTotal - coreTd - electiveTd;
        if (unassignedTd > 0) coreTd += unassignedTd;
        int unassignedTp = tpTotal - coreTp - electiveTp;
        if (unassignedTp > 0) coreTp += unassignedTp;

        classification.setCmHour(cmTotal);      classification.setTdHour(tdTotal);
        classification.setTpHour(tpTotal);      classification.setCoreCm(coreCm);
        classification.setCoreTd(coreTd);       classification.setCoreTp(coreTp);
        classification.setElectiveCm(electiveCm); classification.setElectiveTd(electiveTd);
        classification.setElectiveTp(electiveTp);
    }

    private List<Long> parseIds(String csv) {
        List<Long> ids = new ArrayList<>();
        for (String v : csv.split(",")) {
            String t = v.trim();
            if (!t.isEmpty()) ids.add(Long.parseLong(t));
        }
        return ids;
    }
}