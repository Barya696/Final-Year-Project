package td.universite_ndjamena.backend.aspect;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import td.universite_ndjamena.backend.annotation.Auditable;
import td.universite_ndjamena.backend.service.AuditLogService;

import java.lang.reflect.Method;
import java.util.Set;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class ApiActivityAuditAspect {

    private static final Set<String> EXCLUDED_PATHS = Set.of(
            "/api/admin/audit-logs",
            "/api/auth/heartbeat",
            "/api/auth/password-policy"
    );

    private final AuditLogService auditLogService;

    @Around("execution(* td.universite_ndjamena.backend.controller..*(..))")
    public Object auditApiActivity(ProceedingJoinPoint joinPoint) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return joinPoint.proceed();
        }

        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        if (method.isAnnotationPresent(Auditable.class)) {
            return joinPoint.proceed();
        }

        HttpServletRequest request = attributes.getRequest();
        String path = request.getRequestURI();
        if (shouldExcludePath(path)) {
            return joinPoint.proceed();
        }

        String action = resolveAction(request.getMethod(), path);
        if ("READ".equals(action)) {
            return joinPoint.proceed();
        }
        String entityName = resolveEntityName(path);
        String entityId = extractEntityId(path);
        String performedBy = getCurrentUser();
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        Object result;
        try {
            result = joinPoint.proceed();
        } catch (Exception ex) {
            safelyLog(action, entityName, entityId, performedBy, ipAddress, userAgent, ex.getMessage(), "FAILURE");
            throw ex;
        }

        String status = isErrorResponse(result) ? "FAILURE" : "SUCCESS";
        safelyLog(action, entityName, entityId, performedBy, ipAddress, userAgent, null, status);
        return result;
    }

    private boolean shouldExcludePath(String path) {
        return EXCLUDED_PATHS.stream().anyMatch(path::startsWith);
    }

    private String resolveAction(String method, String path) {
        if (path.contains("/login")) return "LOGIN";
        if (path.contains("/logout")) return "LOGOUT";
        if (path.contains("/change-password") || path.contains("/reset-password")) return "PASSWORD_CHANGE";
        if (path.contains("/export")) return "EXPORT";

        return switch (method.toUpperCase()) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> "READ";
        };
    }

    private String resolveEntityName(String path) {
        String normalized = path.startsWith("/api/") ? path.substring(5) : path;
        int slashIndex = normalized.indexOf('/');
        if (slashIndex > -1) {
            normalized = normalized.substring(0, slashIndex);
        }
        return normalized.toUpperCase();
    }

    private String extractEntityId(String path) {
        String[] tokens = path.split("/");
        for (int i = tokens.length - 1; i >= 0; i--) {
            String token = tokens[i];
            if (!token.isBlank() && token.matches("\\d+")) {
                return token;
            }
        }
        return "N/A";
    }

    private String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            String name = authentication.getName();
            if (name != null && !name.isBlank() && !"anonymousUser".equalsIgnoreCase(name)) {
                return name;
            }
        }
        return "UNKNOWN";
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    private boolean isErrorResponse(Object result) {
        if (result instanceof ResponseEntity<?> responseEntity) {
            return responseEntity.getStatusCode().isError();
        }
        return false;
    }

    private void safelyLog(String action, String entityName, String entityId, String performedBy,
                           String ipAddress, String userAgent, String newValue, String status) {
        try {
            auditLogService.logAction(
                    action,
                    entityName,
                    entityId,
                    performedBy,
                    ipAddress,
                    userAgent,
                    null,
                    newValue,
                    status
            );
        } catch (Exception loggingEx) {
            log.error("Failed to write activity audit entry for path action {}", action, loggingEx);
        }
    }
}
