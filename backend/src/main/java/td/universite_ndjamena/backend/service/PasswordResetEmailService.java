package td.universite_ndjamena.backend.service;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PasswordResetEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.password-reset.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.mail.from:}")
    private String mailFrom;

    public PasswordResetEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends a 6-digit reset code if SMTP credentials are configured; otherwise no-op (dev may rely on
     * {@code app.password-reset.expose-token-in-response} which exposes the plain code).
     */
    public void sendPasswordResetCode(String toEmail, String plainSixDigitCode, int validMinutes) {
        if (mailUsername == null || mailUsername.isBlank()
                || mailPassword == null || mailPassword.isBlank()) {
            log.warn(
                    "Password reset email skipped: spring.mail.username/password are blank. "
                            + "Set MAIL_USERNAME/MAIL_PASSWORD or application-local.properties (import must load after defaults).");
            return;
        }

        String base = frontendBaseUrl == null ? "" : frontendBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String resetPageUrl = base + "/reset-password";

        String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : mailUsername.trim();
        String subject = "Your password reset code — Université N'Djamena";
        String text = "You requested a password reset.\n\n"
                + "Your verification code is: " + plainSixDigitCode + "\n\n"
                + "It expires in " + validMinutes + " minutes.\n"
                + "Open " + resetPageUrl + " and enter this email address, the code, and your new password.\n\n"
                + "If you did not request this, you can ignore this email.";
        String html = "<p>You requested a password reset.</p>"
                + "<p style=\"font-size:28px;font-weight:700;letter-spacing:0.25em;font-family:monospace\">"
                + escapeHtml(plainSixDigitCode) + "</p>"
                + "<p>Enter this <strong>6-digit code</strong> on the reset page. It expires in <strong>"
                + validMinutes + " minutes</strong>.</p>"
                + "<p><a href=\"" + escapeHtmlAttr(resetPageUrl) + "\">Open password reset page</a></p>"
                + "<p style=\"color:#666;font-size:12px\">If you did not request this, you can ignore this email.</p>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSender.send(message);
            log.info("Password reset code email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String escapeHtmlAttr(String url) {
        return url.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }
}
