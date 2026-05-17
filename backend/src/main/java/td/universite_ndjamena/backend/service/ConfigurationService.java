package td.universite_ndjamena.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import td.universite_ndjamena.backend.model.Configuration;
import td.universite_ndjamena.backend.repository.ConfigurationRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class ConfigurationService {

    private static final long SINGLETON_ID = 1L;
    private final ConfigurationRepository configurationRepository;

    public Configuration getConfiguration() {
        return configurationRepository.findById(SINGLETON_ID).orElseGet(this::createDefaultConfiguration);
    }

    public Configuration updateConfiguration(Configuration incoming) {
        validateConfiguration(incoming);
        Configuration current = getConfiguration();

        current.setRepublicName(incoming.getRepublicName());
        current.setUniversityName(incoming.getUniversityName());
        current.setFacultyName(incoming.getFacultyName());
        current.setDepartmentName(incoming.getDepartmentName());
        current.setDocumentTitle(incoming.getDocumentTitle());
        current.setAcademicYear(incoming.getAcademicYear());
        current.setReferencePrefix(incoming.getReferencePrefix());
        current.setLecturerLabel(incoming.getLecturerLabel());
        current.setDepartmentLabel(incoming.getDepartmentLabel());
        current.setGradeLabel(incoming.getGradeLabel());
        current.setGroupsLabel(incoming.getGroupsLabel());
        current.setNumberOfCoursesLabel(incoming.getNumberOfCoursesLabel());
        current.setReferenceNumberLabel(incoming.getReferenceNumberLabel());
        current.setSemesterOneCmHours(incoming.getSemesterOneCmHours());
        current.setSemesterOneTdHours(incoming.getSemesterOneTdHours());
        current.setSemesterOneTpHours(incoming.getSemesterOneTpHours());
        current.setSemesterTwoCmHours(incoming.getSemesterTwoCmHours());
        current.setSemesterTwoTdHours(incoming.getSemesterTwoTdHours());
        current.setSemesterTwoTpHours(incoming.getSemesterTwoTpHours());
        current.setCmRate(incoming.getCmRate());
        current.setTdRate(incoming.getTdRate());
        current.setTpRate(incoming.getTpRate());
        current.setFinancialSummaryTitle(incoming.getFinancialSummaryTitle());
        current.setReferenceLabel(incoming.getReferenceLabel());
        current.setDateLabel(incoming.getDateLabel());
        current.setSectionIdentificationTitle(incoming.getSectionIdentificationTitle());
        current.setSectionHoursDetailTitle(incoming.getSectionHoursDetailTitle());
        current.setTypeLabel(incoming.getTypeLabel());
        current.setSemesterOneLabel(incoming.getSemesterOneLabel());
        current.setSemesterTwoLabel(incoming.getSemesterTwoLabel());
        current.setExtraHoursLabel(incoming.getExtraHoursLabel());
        current.setTotalsLabel(incoming.getTotalsLabel());
        current.setCombinedTotalLabel(incoming.getCombinedTotalLabel());
        current.setSectionFinancialTitle(incoming.getSectionFinancialTitle());
        current.setEstimatedCostLabel(incoming.getEstimatedCostLabel());

        return configurationRepository.save(current);
    }

    private Configuration createDefaultConfiguration() {
        Configuration defaults = Configuration.builder()
                .id(SINGLETON_ID)
                .republicName("REPUBLIC OF CAMEROON")
                .universityName("University of Yaounde I")
                .facultyName("Faculty of Sciences")
                .departmentName("Department of Computer Science")
                .documentTitle("Teaching Load Approval Record")
                .academicYear("2025 / 2026")
                .referencePrefix("FS/CS")
                .lecturerLabel("Lecturer Name")
                .departmentLabel("Department")
                .gradeLabel("Grade / Rank")
                .groupsLabel("Groups")
                .numberOfCoursesLabel("No. of Courses")
                .referenceNumberLabel("Reference No.")
                .semesterOneCmHours(28)
                .semesterOneTdHours(21)
                .semesterOneTpHours(11)
                .semesterTwoCmHours(24)
                .semesterTwoTdHours(24)
                .semesterTwoTpHours(11)
                .cmRate(1000)
                .tdRate(1000)
                .tpRate(1000)
                .financialSummaryTitle("Financial Summary")
                .referenceLabel("Ref. No:")
                .dateLabel("Date:")
                .sectionIdentificationTitle("I. Identification")
                .sectionHoursDetailTitle("II. Teaching Hours Detail")
                .typeLabel("Type")
                .semesterOneLabel("Semester 1")
                .semesterTwoLabel("Semester 2")
                .extraHoursLabel("Extra Hours")
                .totalsLabel("Totals")
                .combinedTotalLabel("Combined Total")
                .sectionFinancialTitle("III. Financial Estimate")
                .estimatedCostLabel("Estimated Cost S1 / S2")
                .build();
        return configurationRepository.save(defaults);
    }

    private void validateConfiguration(Configuration configuration) {
        if (isBlank(configuration.getRepublicName())
                || isBlank(configuration.getUniversityName())
                || isBlank(configuration.getFacultyName())
                || isBlank(configuration.getDepartmentName())
                || isBlank(configuration.getDocumentTitle())
                || isBlank(configuration.getAcademicYear())
                || isBlank(configuration.getReferencePrefix())
                || isBlank(configuration.getLecturerLabel())
                || isBlank(configuration.getDepartmentLabel())
                || isBlank(configuration.getGradeLabel())
                || isBlank(configuration.getGroupsLabel())
                || isBlank(configuration.getNumberOfCoursesLabel())
                || isBlank(configuration.getReferenceNumberLabel())
                || isBlank(configuration.getFinancialSummaryTitle())
                || isBlank(configuration.getReferenceLabel())
                || isBlank(configuration.getDateLabel())
                || isBlank(configuration.getSectionIdentificationTitle())
                || isBlank(configuration.getSectionHoursDetailTitle())
                || isBlank(configuration.getTypeLabel())
                || isBlank(configuration.getSemesterOneLabel())
                || isBlank(configuration.getSemesterTwoLabel())
                || isBlank(configuration.getExtraHoursLabel())
                || isBlank(configuration.getTotalsLabel())
                || isBlank(configuration.getCombinedTotalLabel())
                || isBlank(configuration.getSectionFinancialTitle())
                || isBlank(configuration.getEstimatedCostLabel())) {
            throw new IllegalArgumentException("All text fields are required.");
        }

        if (configuration.getSemesterOneCmHours() == null || configuration.getSemesterOneCmHours() < 0
                || configuration.getSemesterOneTdHours() == null || configuration.getSemesterOneTdHours() < 0
                || configuration.getSemesterOneTpHours() == null || configuration.getSemesterOneTpHours() < 0
                || configuration.getSemesterTwoCmHours() == null || configuration.getSemesterTwoCmHours() < 0
                || configuration.getSemesterTwoTdHours() == null || configuration.getSemesterTwoTdHours() < 0
                || configuration.getSemesterTwoTpHours() == null || configuration.getSemesterTwoTpHours() < 0
                || configuration.getCmRate() == null || configuration.getCmRate() < 0
                || configuration.getTdRate() == null || configuration.getTdRate() < 0
                || configuration.getTpRate() == null || configuration.getTpRate() < 0) {
            throw new IllegalArgumentException("Hours and rates must be positive numbers or zero.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
