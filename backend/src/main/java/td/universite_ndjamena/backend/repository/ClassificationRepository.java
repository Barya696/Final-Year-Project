package td.universite_ndjamena.backend.repository;

import td.universite_ndjamena.backend.model.Classification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClassificationRepository extends JpaRepository<Classification, Long> {

    @Query("SELECT c FROM Classification c WHERE c.lecturer.id = :lecturerId")
    List<Classification> findByLecturerId(@Param("lecturerId") Long lecturerId);

    @Query("SELECT c FROM Classification c WHERE c.lecturer.id = :lecturerId AND c.department.id = :departmentId")
    List<Classification> findByLecturerIdAndDepartmentId(
            @Param("lecturerId") Long lecturerId,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.lecturer.id = :lecturerId AND c.semester = :semester")
    List<Classification> findByLecturerAndSemester(
            @Param("lecturerId") Long lecturerId,
            @Param("semester") String semester);

    @Query("SELECT c FROM Classification c WHERE c.lecturer.id = :lecturerId AND c.semester = :semester AND c.department.id = :departmentId")
    List<Classification> findByLecturerAndSemesterAndDepartmentId(
            @Param("lecturerId") Long lecturerId,
            @Param("semester") String semester,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.semester = :semester")
    List<Classification> findBySemester(@Param("semester") String semester);

    @Query("SELECT c FROM Classification c WHERE c.semester = :semester AND c.department.id = :departmentId")
    List<Classification> findBySemesterAndDepartmentId(
            @Param("semester") String semester,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.classifiedStatus = :status")
    List<Classification> findByStatus(
            @Param("status") Classification.ClassificationStatus status);

    @Query("SELECT c FROM Classification c WHERE c.classifiedStatus = :status AND c.department.id = :departmentId")
    List<Classification> findByStatusAndDepartmentId(
            @Param("status") Classification.ClassificationStatus status,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.department.id = :departmentId")
    List<Classification> findByDepartmentId(@Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.lecturer.id = :lecturerId AND c.semester = :semester AND c.courseIds = :courseIds AND c.groupIds = :groupIds AND c.department.id = :departmentId")
    Optional<Classification> findExisting(
            @Param("lecturerId") Long lecturerId,
            @Param("semester") String semester,
            @Param("courseIds") String courseIds,
            @Param("groupIds") String groupIds,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.courseIds LIKE CONCAT('%', :courseIdStr, '%')")
    List<Classification> findByCourseId(@Param("courseIdStr") String courseIdStr);

    @Query("SELECT c FROM Classification c WHERE c.courseIds LIKE CONCAT('%', :courseIdStr, '%') AND c.department.id = :departmentId")
    List<Classification> findByCourseIdAndDepartmentId(
            @Param("courseIdStr") String courseIdStr,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c WHERE c.groupIds LIKE CONCAT('%', :groupIdStr, '%')")
    List<Classification> findByGroupId(@Param("groupIdStr") String groupIdStr);

    @Query("SELECT c FROM Classification c WHERE c.groupIds LIKE CONCAT('%', :groupIdStr, '%') AND c.department.id = :departmentId")
    List<Classification> findByGroupIdAndDepartmentId(
            @Param("groupIdStr") String groupIdStr,
            @Param("departmentId") Long departmentId);

    @Query("SELECT c FROM Classification c")
    List<Classification> findAllClassifications();
}
