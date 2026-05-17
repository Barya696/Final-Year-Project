package td.universite_ndjamena.backend.dto;

import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompileRequest {

    @NotNull(message = "Lecturer ID is required")
    @JsonProperty("lecturerId")
    @JsonAlias({"lecturer_id", "lecturerId"})
    private Long lecturerId;
}