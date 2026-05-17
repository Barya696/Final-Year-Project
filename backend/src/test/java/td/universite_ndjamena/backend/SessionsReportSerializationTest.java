package td.universite_ndjamena.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import td.universite_ndjamena.backend.service.SessionService;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@SpringBootTest
class SessionsReportSerializationTest {

    @Autowired
    SessionService sessionService;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void reportRowsSerializeToJsonLikeRestEndpoint() {
        assertDoesNotThrow(() -> {
            var rows = sessionService.getSessionsForReport(null, null, null);
            objectMapper.writeValueAsString(rows);
        });
    }
}
