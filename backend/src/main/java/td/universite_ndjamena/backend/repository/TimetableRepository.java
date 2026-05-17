package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import td.universite_ndjamena.backend.model.Timetable;

import java.time.DayOfWeek;
import java.util.List;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long> {

    List<Timetable> findBySemester(String semester);

    @Query("""
            SELECT t FROM Timetable t
            WHERE t.semester = :semester AND t.room.id = :roomId AND t.dayOfWeek = :dayOfWeek
            """)
    List<Timetable> findBySemesterAndRoom_IdAndDayOfWeek(
            @Param("semester") String semester,
            @Param("roomId") Long roomId,
            @Param("dayOfWeek") DayOfWeek dayOfWeek);

    @Query("""
            SELECT t FROM Timetable t
            WHERE t.semester = :semester AND t.lecturer.id = :lecturerId AND t.dayOfWeek = :dayOfWeek
            """)
    List<Timetable> findBySemesterAndLecturer_IdAndDayOfWeek(
            @Param("semester") String semester,
            @Param("lecturerId") Long lecturerId,
            @Param("dayOfWeek") DayOfWeek dayOfWeek);
}
