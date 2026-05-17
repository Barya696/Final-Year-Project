package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer l JOIN FETCH s.course c LEFT JOIN FETCH s.hodDepartment WHERE l.lecturerName = :name")
    List<Session> findSessionsByLecturerName(@Param("name") String name);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer l JOIN FETCH s.course c LEFT JOIN FETCH s.hodDepartment WHERE l.lecturerName = :name AND s.hodDepartment.id = :departmentId")
    List<Session> findSessionsByLecturerNameAndDepartmentId(@Param("name") String name, @Param("departmentId") Long departmentId);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment")
    List<Session> findAllSessionsWithLecturer();

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.hodDepartment.id = :departmentId")
    List<Session> findAllSessionsWithLecturerByDepartmentId(@Param("departmentId") Long departmentId);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.semester = :semester")
    List<Session> findSessionsBySemester(@Param("semester") String semester);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.semester = :semester AND s.hodDepartment.id = :departmentId")
    List<Session> findSessionsBySemesterAndDepartmentId(@Param("semester") String semester, @Param("departmentId") Long departmentId);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.lecturer.id = :lecturerId ORDER BY s.sessionDate, s.startTime")
    List<Session> findSessionsByLecturerIdWithDetails(@Param("lecturerId") Long lecturerId);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.lecturer.id = :lecturerId AND s.hodDepartment.id = :departmentId ORDER BY s.sessionDate, s.startTime")
    List<Session> findSessionsByLecturerIdAndDepartmentIdWithDetails(@Param("lecturerId") Long lecturerId, @Param("departmentId") Long departmentId);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.lecturer.id = :lecturerId AND s.semester = :semester ORDER BY s.sessionDate, s.startTime")
    List<Session> findSessionsByLecturerIdAndSemesterWithDetails(@Param("lecturerId") Long lecturerId, @Param("semester") String semester);

    @Query("SELECT s FROM Session s JOIN FETCH s.lecturer JOIN FETCH s.course LEFT JOIN FETCH s.hodDepartment WHERE s.lecturer.id = :lecturerId AND s.semester = :semester AND s.hodDepartment.id = :departmentId ORDER BY s.sessionDate, s.startTime")
    List<Session> findSessionsByLecturerIdAndSemesterAndDepartmentIdWithDetails(
            @Param("lecturerId") Long lecturerId,
            @Param("semester") String semester,
            @Param("departmentId") Long departmentId);
}
