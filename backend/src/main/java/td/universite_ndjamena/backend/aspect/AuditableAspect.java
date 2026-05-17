package td.universite_ndjamena.backend.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import td.universite_ndjamena.backend.annotation.Auditable;
import td.universite_ndjamena.backend.model.Notification;
import td.universite_ndjamena.backend.service.AuditLogService;
import td.universite_ndjamena.backend.service.NotificationService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PathVariable;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AuditableAspect {

    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void auditAfterSuccess(JoinPoint joinPoint, Auditable auditable, Object result) {
        try {
            String action = auditable.action();
            String entity = auditable.entity();
            String entityId = extractEntityId(joinPoint, auditable.idParam());
            String performedBy = resolvePerformedBy(joinPoint, action);
            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();
            String newValue = serializeObject(result);
            String status = isErrorResponse(result) ? "FAILURE" : "SUCCESS";

            auditLogService.logAction(
                    action,
                    entity,
                    entityId,
                    performedBy,
                    ipAddress,
                    userAgent,
                    null, // oldValue not available in this context
                    newValue,
                    status
            );

            maybeNotifyAdmins(action, performedBy, status);
            log.info("Audited successful action: {} on {}", action, entity);
        } catch (Exception e) {
            log.error("Error during audit logging", e);
        }
    }

    @AfterThrowing(pointcut = "@annotation(auditable)", throwing = "exception")
    public void auditAfterException(JoinPoint joinPoint, Auditable auditable, Exception exception) {
        try {
            String action = auditable.action();
            String entity = auditable.entity();
            String entityId = extractEntityId(joinPoint, auditable.idParam());
            String performedBy = resolvePerformedBy(joinPoint, action);
            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();
            String exceptionDetails = exception.getMessage();

            auditLogService.logAction(
                    action,
                    entity,
                    entityId,
                    performedBy,
                    ipAddress,
                    userAgent,
                    null,
                    exceptionDetails,
                    "FAILURE"
            );

            maybeNotifyAdmins(action, performedBy, "FAILURE");
            log.warn("Audited failed action: {} on {} - Exception: {}", action, entity, exceptionDetails);
        } catch (Exception e) {
            log.error("Error during audit logging for exception", e);
        }
    }

    private String extractEntityId(JoinPoint joinPoint, String idParam) {
        Object[] args = joinPoint.getArgs();
        String[] paramNames = getMethodParamNames(joinPoint);

        for (int i = 0; i < paramNames.length; i++) {
            if (paramNames[i].equals(idParam) && i < args.length) {
                return String.valueOf(args[i]);
            }
        }

        Method method = getMethod(joinPoint);
        if (method != null) {
            Annotation[][] parameterAnnotations = method.getParameterAnnotations();
            for (int i = 0; i < parameterAnnotations.length && i < args.length; i++) {
                for (Annotation annotation : parameterAnnotations[i]) {
                    if (annotation instanceof PathVariable pathVariable) {
                        String pathVarName = pathVariable.value().isBlank() ? pathVariable.name() : pathVariable.value();
                        if (pathVarName.isBlank() || pathVarName.equals(idParam)) {
                            return String.valueOf(args[i]);
                        }
                    }
                }
            }
        }
        return "UNKNOWN";
    }

    private String[] getMethodParamNames(JoinPoint joinPoint) {
        if (joinPoint.getSignature() instanceof MethodSignature methodSignature) {
            String[] parameterNames = methodSignature.getParameterNames();
            return parameterNames != null ? parameterNames : new String[0];
        }
        return new String[0];
    }

    private Method getMethod(JoinPoint joinPoint) {
        if (joinPoint.getSignature() instanceof MethodSignature methodSignature) {
            return methodSignature.getMethod();
        }
        return null;
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

    private String resolvePerformedBy(JoinPoint joinPoint, String action) {
        String currentUser = getCurrentUser();
        if (!"UNKNOWN".equals(currentUser)) {
            return currentUser;
        }

        // Login endpoint is called before Spring Security sets an authenticated principal.
        if ("LOGIN".equalsIgnoreCase(action)) {
            String email = extractEmailFromArgs(joinPoint.getArgs());
            if (email != null && !email.isBlank()) {
                return email.trim();
            }
        }
        return "UNKNOWN";
    }

    @SuppressWarnings("unchecked")
    private String extractEmailFromArgs(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof java.util.Map<?, ?> map) {
                Object candidate = map.get("email");
                if (candidate instanceof String email) {
                    return email;
                }
            }
        }
        return null;
    }

    private String getClientIpAddress() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty()) {
                ip = request.getRemoteAddr();
            }
            return ip;
        }
        return "UNKNOWN";
    }

    private String getUserAgent() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            return request.getHeader("User-Agent");
        }
        return "UNKNOWN";
    }

    private String serializeObject(Object obj) {
        try {
            if (obj == null) {
                return null;
            }
            if (obj instanceof ResponseEntity<?> responseEntity) {
                Object body = responseEntity.getBody();
                return body != null ? objectMapper.writeValueAsString(body) : null;
            }
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Error serializing object", e);
            return obj.toString();
        }
    }

    private boolean isErrorResponse(Object result) {
        if (result instanceof ResponseEntity<?> responseEntity) {
            return responseEntity.getStatusCode().isError();
        }
        return false;
    }

    private void maybeNotifyAdmins(String action, String performedBy, String status) {
        if ("LOGIN".equalsIgnoreCase(action) && "FAILURE".equalsIgnoreCase(status)) {
            notificationService.notifyAdmins(
                    Notification.NotificationEventType.LOGIN_FAILED,
                    "Login failed",
                    "A login attempt failed for user: " + performedBy,
                    Notification.NotificationPriority.HIGH
            );
            return;
        }
        if ("PASSWORD_CHANGE".equalsIgnoreCase(action) && "SUCCESS".equalsIgnoreCase(status)) {
            notificationService.notifyAdmins(
                    Notification.NotificationEventType.PASSWORD_CHANGED,
                    "Password changed",
                    "Password was changed by user: " + performedBy,
                    Notification.NotificationPriority.MEDIUM
            );
        }
    }
}
