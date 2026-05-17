package td.universite_ndjamena.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import td.universite_ndjamena.backend.model.TeachingAssignment;

import java.util.List;

@Repository
public interface TeachingAssignmentsRepository extends JpaRepository<TeachingAssignment, Long> {

    List<TeachingAssignment> findBySemesterOrderByAssignmentDateAscIdAsc(String semester);

    List<TeachingAssignment> findAllByOrderByAssignmentDateDescIdDesc();

    List<TeachingAssignment> findBySemester(String semester);
}
