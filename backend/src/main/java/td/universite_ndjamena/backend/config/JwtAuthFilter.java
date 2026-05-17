package td.universite_ndjamena.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.core.AuthenticatedPrincipal;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import td.universite_ndjamena.backend.model.Users;
import td.universite_ndjamena.backend.repository.UsersRepository;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsersRepository usersRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // No token → pass through (public endpoints will still work)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            final String userEmail = jwtService.extractEmail(jwt);
            if (userEmail == null || userEmail.isBlank()) {
                sendUnauthorized(response, "Invalid or expired token");
                return;
            }

            Users user = usersRepository.findByEmail(userEmail.trim()).orElse(null);

            if (user == null) {
                sendUnauthorized(response, "User not found");
                return;
            }

            if (user.getStatus() == Users.UserStatus.INACTIVE
                    || user.getStatus() == Users.UserStatus.SUSPENDED) {
                sendUnauthorized(response, "Account is blocked");
                return;
            }

            if (!jwtService.isTokenValid(jwt, userEmail)) {
                sendUnauthorized(response, "Invalid or expired token");
                return;
            }

            // Same logical id as users.department_id (set for HOD accounts; null for other roles).
            Long departmentId = usersRepository.findDepartmentIdByUserId(user.getId()).orElse(null);

            AuthPrincipal principal = new AuthPrincipal(
                    user.getId(),
                    user.getEmail(),
                    user.getRole().name(),
                    departmentId);
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        } catch (Exception e) {
            sendUnauthorized(response, "Invalid or expired token");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }

    /**
     * Lightweight auth principal (no JPA / lazy fields). Implements {@link AuthenticatedPrincipal}
     * so {@code Authentication#getName()} returns the email instead of {@code Record#toString()}.
     *
     * @param departmentId copied from {@code users.department_id} for this user (typically set for HOD only)
     */
    public record AuthPrincipal(Long id, String email, String role, Long departmentId) implements AuthenticatedPrincipal {
        @Override
        public String getName() {
            return email != null && !email.isBlank() ? email : "unknown";
        }
    }
}
