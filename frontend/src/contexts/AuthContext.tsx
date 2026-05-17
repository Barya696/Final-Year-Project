import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getOrCreateDeviceId } from "@/utils/deviceId";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FrontendRole =
  | "HOD"
  | "Vice-dean"
  | "Academic Monitoring Officer"
  | "Finance Officer"
  | "Dean"
  | "Admin";

export type BackendRole = "ADMIN" | "HOD" | "VICE_DEAN" | "AMO" | "FINANCE_OFFICER" | "DEAN";
type PermissionPage =
  | "TARIFF"
  | "COURSE_ASSIGNMENT"
  | "CLASSIFIED"
  | "INTEGRATION"
  | "REQUIRED"
  | "SESSIONS"
  | "TEACHING_SCHEDULE"
  | "ARCHIVE";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  backendRole: BackendRole;
  displayRole: FrontendRole;
  token: string;
  /** Present when the backend user row is linked to a department (e.g. HOD). */
  departmentId?: number | null;
}

/** Successful login or 2FA verification payload from the API */
export interface LoginSuccessPayload {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: BackendRole;
  sessionTimeoutMinutes?: number;
  departmentId?: number | null;
}

export type LoginResult =
  | { status: "authenticated" }
  | { status: "needs_two_factor"; email: string; devOtp?: string };

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** After POST /verify-2fa-login — stores token and user the same way as login(). */
  completeLoginFromResponse: (data: LoginSuccessPayload) => void;
  logout: () => void;
  hasRole: (roles: FrontendRole | FrontendRole[]) => boolean;
  hasPermission: (feature: string) => boolean;
  /** Use this instead of raw fetch() — auto-logouts on 401/403 (blocked/expired) */
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKEND_TO_FRONTEND_ROLE: Record<string, FrontendRole> = {
  ADMIN:               "Admin",
  HOD:                 "HOD",
  VICE_DEAN:           "Vice-dean",
  AMO:                 "Academic Monitoring Officer",
  MONITORING_OFFICER:  "Academic Monitoring Officer",
  FINANCE_OFFICER:     "Finance Officer",
  DEAN:                "Dean",
};

export type Feature =
  | "TARIFF"
  | "COURSE_ASSIGNMENTS"
  | "CLASSIFIED"
  | "INTEGRATION"
  | "REQUIRED"
  | "SESSIONS"
  | "TEACHING_SCHEDULE"
  | "ARCHIVE"
  | "SETTINGS"
  | "HOD_DASHBOARD"
  | "VICE_DEAN_DASHBOARD"
  | "AMO_DASHBOARD"
  | "FINANCE_DASHBOARD"
  | "DEAN_DASHBOARD"
  | "ADMIN_DASHBOARD"
  | "USERS_DIRECTORY"
  | "INTEGRATION"
  | "AUDIT"
  | "CONFIGURATION"
  | "NOTIFICATION";

const ROLE_PERMISSIONS: Record<FrontendRole, Feature[]> = {
  HOD: ["HOD_DASHBOARD", "COURSE_ASSIGNMENTS", "SESSIONS", "ARCHIVE", "TEACHING_SCHEDULE", "SETTINGS", "NOTIFICATION"],
  "Vice-dean": ["VICE_DEAN_DASHBOARD", "CLASSIFIED", "SESSIONS", "ARCHIVE", "TEACHING_SCHEDULE", "SETTINGS", "NOTIFICATION"],
  "Academic Monitoring Officer": ["AMO_DASHBOARD", "CLASSIFIED", "REQUIRED", "SESSIONS", "ARCHIVE", "TEACHING_SCHEDULE", "SETTINGS", "NOTIFICATION"],
  "Finance Officer": ["FINANCE_DASHBOARD", "TARIFF", "ARCHIVE", "TEACHING_SCHEDULE", "SETTINGS", "NOTIFICATION"],
  Dean: ["DEAN_DASHBOARD", "CLASSIFIED", "SESSIONS", "ARCHIVE", "TEACHING_SCHEDULE", "SETTINGS", "NOTIFICATION"],
  Admin: ["ADMIN_DASHBOARD", "USERS_DIRECTORY", "INTEGRATION", "AUDIT", "CONFIGURATION", "NOTIFICATION", "TARIFF", "COURSE_ASSIGNMENTS", "CLASSIFIED", "REQUIRED", "SESSIONS", "TEACHING_SCHEDULE", "ARCHIVE", "SETTINGS"],
};

export const ROLE_DEFAULT_NAV: Record<FrontendRole, string> = {
  HOD:                           "hod-dashboard",
  "Vice-dean":                   "submittedRecords",
  "Academic Monitoring Officer": "fiches",
  "Finance Officer":             "tariffication",
  Dean:                          "approval",
  Admin:                         "admin",
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverPermissions, setServerPermissions] = useState<Set<Feature> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.removeItem("authUser"); }
    }
    setIsLoading(false);
  }, []);

  // ── logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      void fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {
        // Logout should continue even if audit endpoint fails.
      });
    }
    setUser(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    // Redirect to login — works regardless of current route
    window.location.href = "/login";
  }, []);

  // ── apiFetch ────────────────────────────────────────────────────────────────
  // Drop-in replacement for fetch() used by usersAPI.ts and any other service.
  // Attaches JWT automatically and calls logout() the moment a 401/403 comes
  // back — which happens when token is invalid/expired or account is blocked.
  const apiFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = localStorage.getItem("authToken");

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      // Token invalid, expired, or admin blocked this account
      logout();
      throw new Error("Session ended. Please log in again.");
    }

    return res;
  }, [logout]);

  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!user) {
        setServerPermissions(null);
        return;
      }

      try {
        const res = await apiFetch(`http://localhost:8080/api/permissions/role/${user.backendRole}`);
        const data = (await res.json()) as Array<{ page: PermissionPage; allowed: boolean }>;
        const mapped = data
          .filter((item) => item.allowed)
          .map((item) => {
            const pageToFeature: Record<PermissionPage, Feature> = {
              TARIFF: "TARIFF",
              COURSE_ASSIGNMENT: "COURSE_ASSIGNMENTS",
              CLASSIFIED: "CLASSIFIED",
              INTEGRATION: "INTEGRATION",
              REQUIRED: "REQUIRED",
              SESSIONS: "SESSIONS",
              TEACHING_SCHEDULE: "TEACHING_SCHEDULE",
              ARCHIVE: "ARCHIVE",
            };
            return pageToFeature[item.page];
          });
        setServerPermissions(new Set(mapped));
      } catch {
        // Fallback to local defaults if backend matrix is unavailable.
        setServerPermissions(null);
      }
    };

    loadRolePermissions();
  }, [user, apiFetch]);

  // ── heartbeat ────────────────────────────────────────────────────────────────
  // Poll a protected endpoint so blocked users are logged out quickly
  // even when they are idle on a page with no API actions.
  useEffect(() => {
    if (!user) return;

    const intervalMs = 3000; // 3s for near-immediate forced logout
    const ping = async () => {
      try {
        await apiFetch("http://localhost:8080/api/auth/heartbeat");
      } catch {
        // apiFetch already handles 401/403 by logging out.
      }
    };

    // Run once immediately and then keep checking.
    ping();
    const id = window.setInterval(ping, intervalMs);
    return () => window.clearInterval(id);
  }, [user, apiFetch]);

  const completeLoginFromResponse = useCallback((data: LoginSuccessPayload) => {
    const backendRole = data.role as BackendRole;
    const displayRole = BACKEND_TO_FRONTEND_ROLE[backendRole];

    if (!displayRole) {
      throw new Error(`Invalid role from server: ${backendRole}`);
    }

    const authUser: AuthUser = {
      id:          data.userId,
      name:        data.name,
      email:       data.email,
      backendRole,
      displayRole,
      token:       data.token,
      departmentId: typeof data.departmentId === "number" ? data.departmentId : undefined,
    };

    setUser(authUser);
    localStorage.setItem("authUser", JSON.stringify(authUser));
    localStorage.setItem("authToken", data.token);
  }, []);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      const deviceId = getOrCreateDeviceId();
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceId }),
      });

      const data = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : "Login failed";
        const extra =
          typeof data.remainingAttempts === "number"
            ? ` (${data.remainingAttempts} attempt(s) remaining)`
            : "";
        throw new Error(msg + extra);
      }

      if (data.requiresTwoFactor === true) {
        return {
          status: "needs_two_factor",
          email: String(data.email ?? email),
          devOtp: typeof data.devOtp === "string" ? data.devOtp : undefined,
        };
      }

      completeLoginFromResponse(data as unknown as LoginSuccessPayload);
      return { status: "authenticated" };
    } finally {
      setIsLoading(false);
    }
  };

  // ── helpers ─────────────────────────────────────────────────────────────────
  const hasRole = (roles: FrontendRole | FrontendRole[]): boolean => {
    if (!user) return false;
    return (Array.isArray(roles) ? roles : [roles]).includes(user.displayRole);
  };

  const hasPermission = (feature: string): boolean => {
    if (!user) return false;
    const dashboardFeatureByRole: Record<FrontendRole, Feature> = {
      HOD: "HOD_DASHBOARD",
      "Vice-dean": "VICE_DEAN_DASHBOARD",
      "Academic Monitoring Officer": "AMO_DASHBOARD",
      "Finance Officer": "FINANCE_DASHBOARD",
      Dean: "DEAN_DASHBOARD",
      Admin: "ADMIN_DASHBOARD",
    };
    const roleDashboard = dashboardFeatureByRole[user.displayRole];
    if (feature === roleDashboard) return true;
    if (feature.endsWith("_DASHBOARD")) return false;

    if (serverPermissions) {
      if (["USERS_DIRECTORY", "AUDIT", "CONFIGURATION", "NOTIFICATION", "SETTINGS"].includes(feature)) {
        return (ROLE_PERMISSIONS[user.displayRole] ?? []).includes(feature as Feature);
      }
      return serverPermissions.has(feature as Feature);
    }

    return (ROLE_PERMISSIONS[user.displayRole] ?? []).includes(feature as Feature);
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading,
      login, completeLoginFromResponse, logout, hasRole, hasPermission, apiFetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};