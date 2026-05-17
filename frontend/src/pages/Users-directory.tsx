"use client";

import { Download, Search, X, Users, Shield, Lock, FileText } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useAuth } from "../contexts/AuthContext";
import UsersAPI, { type ApiUser } from "@/services/usersAPI";

const API_BASE = "http://localhost:8080/api";

interface ReportLecturer {
  id: number;
  lecturerName: string;
  grade?: string;
  department?: string;
}

interface SessionReportRow {
  id: number;
  lecturer?: { id: number; lecturerName: string; grade?: string; department?: string };
  lecturer_name?: string;
  department?: string;
  courseName?: string;
  semester?: string;
  startTime?: string;
  endTime?: string;
  groupCode?: string;
  sessionType?: string;
  chapters?: number;
  sessionDate?: string;
}

function reportRowLecturerName(row: SessionReportRow): string {
  return row.lecturer?.lecturerName ?? row.lecturer_name ?? "—";
}

function reportRowDepartment(row: SessionReportRow): string {
  return row.lecturer?.department ?? row.department ?? "";
}

function timeToMinutes(time: string): number {
  const parts = time.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes) return "0h";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
}

function rowMatchesPeriod(sessionDateRaw: string | undefined, period: string): boolean {
  if (!sessionDateRaw || period === "All time") return true;
  const d = new Date(sessionDateRaw);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const q = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(now.getFullYear(), q * 3, 1);
  switch (period) {
    case "This month": return d >= startOfMonth && d <= now;
    case "This quarter": return d >= startOfQuarter && d <= now;
    case "This semester": {
      const y = now.getFullYear();
      const aug1 = new Date(y, 7, 1);
      const jan1 = new Date(y, 0, 1);
      const boundary = now.getMonth() >= 7 ? aug1 : jan1;
      return d >= boundary && d <= now;
    }
    default: return true;
  }
}

function sessionsToCsv(rows: SessionReportRow[]): string {
  const esc = (v: string | number | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = "Lecturer,Department,Course,Semester,Date,Start,End,Hours,Group,Type,Chapters";
  const lines = rows.map((r) => {
    const mins = r.startTime && r.endTime ? timeToMinutes(r.endTime) - timeToMinutes(r.startTime) : 0;
    const hrs = (mins / 60).toFixed(2);
    return [
      esc(reportRowLecturerName(r)), esc(reportRowDepartment(r)), esc(r.courseName),
      esc(r.semester), esc(r.sessionDate), esc(r.startTime), esc(r.endTime),
      hrs, esc(r.groupCode), esc(r.sessionType), esc(r.chapters),
    ].join(",");
  });
  return `\uFEFF${header}\n${lines.join("\n")}`;
}

function printReportTable(rows: SessionReportRow[]): void {
  const w = window.open("", "_blank");
  if (!w) return;
  const rowsHtml = rows.map((r) => {
    const mins = r.startTime && r.endTime ? timeToMinutes(r.endTime) - timeToMinutes(r.startTime) : 0;
    return `<tr>
      <td>${reportRowLecturerName(r)}</td><td>${reportRowDepartment(r)}</td>
      <td>${r.courseName ?? ""}</td><td>${r.semester ?? ""}</td>
      <td>${r.sessionDate ?? ""}</td><td>${r.startTime ?? ""}</td>
      <td>${r.endTime ?? ""}</td><td>${formatMinutes(mins)}</td>
      <td>${r.groupCode ?? ""}</td><td>${r.sessionType ?? ""}</td>
      <td>${r.chapters ?? ""}</td>
    </tr>`;
  }).join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Academic session report</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 16px; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #374151; color: #fff; }
      h1 { font-size: 18px; margin-bottom: 12px; }
    </style></head><body>
    <h1>Academic session report</h1>
    <table><thead><tr>
      <th>Lecturer</th><th>Department</th><th>Course</th><th>Semester</th><th>Date</th>
      <th>Start</th><th>End</th><th>Hours</th><th>Group</th><th>Type</th><th>Chapters</th>
    </tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "HOD" | "Vice-dean" | "Academic Monitoring Officer" | "Finance Officer" | "Dean" | "Admin";
  department?: { id: number; departmentName: string };
  status: "Active" | "Blocked";
  password: string;
}

interface Department {
  id: number;
  departmentName: string;
  hod: string;
  numberOfLecturers: number;
}

type RoleType = "HOD" | "Vice-dean" | "Academic Monitoring Officer" | "Finance Officer" | "Dean" | "Admin";
type FeatureType = "TARIFF" | "COURSE_ASSIGNMENT" | "CLASSIFIED" | "INTEGRATION" | "REQUIRED" | "SESSIONS" | "TEACHING_SCHEDULE" | "ARCHIVE";

interface Permissions {
  [role: string]: { [feature: string]: boolean };
}

const initialPermissions: Permissions = {
  HOD: { TARIFF: false, COURSE_ASSIGNMENT: true, CLASSIFIED: false, INTEGRATION: false, REQUIRED: false, SESSIONS: true, TEACHING_SCHEDULE: true, ARCHIVE: true },
  "Vice-dean": { TARIFF: false, COURSE_ASSIGNMENT: false, CLASSIFIED: true, INTEGRATION: false, REQUIRED: false, SESSIONS: true, TEACHING_SCHEDULE: true, ARCHIVE: true },
  "Academic Monitoring Officer": { TARIFF: false, COURSE_ASSIGNMENT: false, CLASSIFIED: true, INTEGRATION: false, REQUIRED: true, SESSIONS: true, TEACHING_SCHEDULE: true, ARCHIVE: true },
  "Finance Officer": { TARIFF: true, COURSE_ASSIGNMENT: false, CLASSIFIED: false, INTEGRATION: false, REQUIRED: false, SESSIONS: false, TEACHING_SCHEDULE: true, ARCHIVE: true },
  Dean: { TARIFF: false, COURSE_ASSIGNMENT: false, CLASSIFIED: true, INTEGRATION: false, REQUIRED: false, SESSIONS: true, TEACHING_SCHEDULE: true, ARCHIVE: true },
  Admin: { TARIFF: true, COURSE_ASSIGNMENT: true, CLASSIFIED: true, INTEGRATION: true, REQUIRED: true, SESSIONS: true, TEACHING_SCHEDULE: true, ARCHIVE: true },
};

type BackendPermission = {
  role: "ADMIN" | "HOD" | "VICE_DEAN" | "AMO" | "FINANCE_OFFICER" | "DEAN";
  page: FeatureType;
  allowed: boolean;
};

type BackendSecuritySettings = {
  maxPasswordAttempts: number;
  sessionTimeoutMinutes: number;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
  requireTwoFactor: boolean;
};

// ── Role badge styling ────────────────────────────────────────────────────────
const getRoleBadgeClass = (role: string): string => {
  const map: Record<string, string> = {
    HOD: "bg-blue-100 text-blue-800 border-blue-300",
    "Vice-dean": "bg-indigo-100 text-indigo-800 border-indigo-300",
    "Academic Monitoring Officer": "bg-purple-100 text-purple-800 border-purple-300",
    "Finance Officer": "bg-green-100 text-green-800 border-green-300",
    Dean: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Admin: "bg-red-100 text-red-800 border-red-300",
  };
  return map[role] ?? "bg-gray-100 text-gray-800 border-gray-300";
};

const getStatusBadgeClass = (status: string): string =>
  status === "Active"
    ? "bg-green-100 text-green-800 border-green-300"
    : "bg-red-100 text-red-800 border-red-300";

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getStatusBadgeClass(status)}`}>
    {status}
  </span>
);

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getRoleBadgeClass(role)}`}>
    {role}
  </span>
);

// ── Role mapping helpers ──────────────────────────────────────────────────────
const mapBackendRoleToFrontend = (backendRole: string): User["role"] => {
  const roleMap: Record<string, User["role"]> = {
    ADMIN: "Admin", HOD: "HOD", VICE_DEAN: "Vice-dean",
    AMO: "Academic Monitoring Officer", FINANCE_OFFICER: "Finance Officer", DEAN: "Dean",
  };
  return roleMap[backendRole] ?? "Vice-dean";
};

const mapFrontendRoleToBackend = (
  frontendRole: User["role"]
): "ADMIN" | "HOD" | "VICE_DEAN" | "AMO" | "FINANCE_OFFICER" | "DEAN" => {
  const roleMap: Record<User["role"], "ADMIN" | "HOD" | "VICE_DEAN" | "AMO" | "FINANCE_OFFICER" | "DEAN"> = {
    Admin: "ADMIN", HOD: "HOD", "Vice-dean": "VICE_DEAN",
    "Academic Monitoring Officer": "AMO", "Finance Officer": "FINANCE_OFFICER", Dean: "DEAN",
  };
  return roleMap[frontendRole] ?? "VICE_DEAN";
};

const mapBackendStatusToFrontend = (backendStatus: string): User["status"] =>
  backendStatus === "ACTIVE" ? "Active" : "Blocked";

const mapBackendRoleToPermissionsRole = (backendRole: BackendPermission["role"]): RoleType => {
  const roleMap: Record<BackendPermission["role"], RoleType> = {
    ADMIN: "Admin", HOD: "HOD", VICE_DEAN: "Vice-dean",
    AMO: "Academic Monitoring Officer", FINANCE_OFFICER: "Finance Officer", DEAN: "Dean",
  };
  return roleMap[backendRole];
};

const convertApiUserToFrontendUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  role: mapBackendRoleToFrontend(apiUser.role),
  department: apiUser.department,
  status: mapBackendStatusToFrontend(apiUser.status),
  password: apiUser.password,
});

// ── Shared form field styles ──────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-gray-500 text-[13px] text-gray-900 placeholder-gray-400 rounded-none";
const selectCls =
  "w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-gray-500 text-[13px] text-gray-900 rounded-none cursor-pointer";
const labelCls = "block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide";

type UserDirectoryFormData = {
  fullName: string;
  email: string;
  role: User["role"];
  departmentId: string;
  password: string;
};

/** Must be declared outside UsersDirectory so React does not remount inputs on every keystroke. */
function UserDirectoryModal({
  title,
  onClose,
  onSave,
  saveLabel,
  saving,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  saving: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-300 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-gray-50">
          <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
            <X size={18} className="text-gray-600" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}
          {children}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-300 bg-gray-50 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 bg-gray-800 text-white text-[13px] font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserFormFields({
  isEdit,
  formData,
  setFormData,
  departments,
  showPassword,
  setShowPassword,
}: {
  isEdit: boolean;
  formData: UserDirectoryFormData;
  setFormData: Dispatch<SetStateAction<UserDirectoryFormData>>;
  departments: Department[];
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <div>
        <label className={labelCls}>Full name</label>
        <input
          type="text"
          placeholder="e.g. Alice Uwimana"
          value={formData.fullName}
          onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input
          type="email"
          placeholder="user@university.ac.rw"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          className={inputCls}
        />
      </div>
      <div className={`grid gap-4 ${formData.role === "HOD" ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className={labelCls}>Role</label>
          <select
            value={formData.role}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                role: e.target.value as User["role"],
                departmentId: "",
              }))
            }
            className={selectCls}
          >
            {(["Admin", "HOD", "Vice-dean", "Academic Monitoring Officer", "Finance Officer", "Dean"] as User["role"][]).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {formData.role === "HOD" && (
          <div>
            <label className={labelCls}>Department</label>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls + " mb-0"}>
            {isEdit ? "New password" : "Password"}
            {isEdit && (
              <span className="ml-1 text-gray-400 font-normal normal-case tracking-normal">(leave blank to keep current)</span>
            )}
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          placeholder={isEdit ? "Enter new password to change it" : "Fixed password for user"}
          value={formData.password}
          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
          className={inputCls}
        />
      </div>
    </>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
const UsersDirectory = () => {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions>(initialPermissions);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    maxPasswordAttempts: 5, sessionTimeout: 30, minPasswordLength: 8,
  });
  const [passwordPolicy, setPasswordPolicy] = useState({
    requireUppercase: true, requireNumbers: true,
    requireSpecialCharacters: false, requireTwoFactor: true,
  });
  const [formData, setFormData] = useState({
    fullName: "", email: "", role: "Vice-dean" as User["role"], departmentId: "", password: "",
  });

  const [reportLecturers, setReportLecturers] = useState<ReportLecturer[]>([]);
  const [reportSessions, setReportSessions] = useState<SessionReportRow[]>([]);
  const [reportDeptFilter, setReportDeptFilter] = useState("All");
  const [reportLecturerId, setReportLecturerId] = useState("");
  const [reportPeriodFilter, setReportPeriodFilter] = useState("All time");
  const [reportSemester, setReportSemester] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const fetchReportSessions = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const params = new URLSearchParams();
      if (reportLecturerId) params.append("lecturerId", reportLecturerId);
      if (reportSemester === "1" || reportSemester === "2") params.append("semester", reportSemester);
      const qs = params.toString();
      const res = await apiFetch(`${API_BASE}/sessions/report${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as SessionReportRow[];
      setReportSessions(Array.isArray(data) ? data : []);
    } catch {
      setReportSessions([]);
      setReportError("Could not load sessions from the server.");
    } finally {
      setReportLoading(false);
    }
  }, [reportLecturerId, reportSemester, apiFetch]);

  useEffect(() => {
    if (activeTab !== "report") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/lecturers`);
        const data = await res.json();
        if (!cancelled) setReportLecturers(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setReportLecturers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, apiFetch]);

  useEffect(() => {
    if (activeTab !== "report") return;
    void fetchReportSessions();
  }, [activeTab, fetchReportSessions]);

  const deptOptions = useMemo(() => {
    const names = new Set<string>();
    reportLecturers.forEach((l) => { if (l.department) names.add(l.department); });
    return ["All", ...Array.from(names).sort()];
  }, [reportLecturers]);

  const lecturersForSelect = useMemo(() => {
    if (!reportDeptFilter || reportDeptFilter === "All") return reportLecturers;
    return reportLecturers.filter((l) => l.department === reportDeptFilter);
  }, [reportLecturers, reportDeptFilter]);

  const filteredReportRows = useMemo(() => {
    return reportSessions.filter((row) => {
      const dept = reportRowDepartment(row);
      if (reportDeptFilter && reportDeptFilter !== "All" && dept !== reportDeptFilter) return false;
      if (!rowMatchesPeriod(row.sessionDate, reportPeriodFilter)) return false;
      return true;
    });
  }, [reportSessions, reportDeptFilter, reportPeriodFilter]);

  const exportReportCsv = () => {
    const blob = new Blob([sessionsToCsv(filteredReportRows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const name = `academic-session-report-${new Date().toISOString().slice(0, 10)}`;
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [apiUsers, departmentsData] = await Promise.all([
          UsersAPI.getAllUsers(),
          apiFetch("http://localhost:8080/api/departments").then((res) => res.json()).catch(() => []),
        ]);
        setUsers(apiUsers.map(convertApiUserToFrontendUser));
        setDepartments(departmentsData ?? []);
        setPermissionsLoading(true);
        const backendPermissions = (await apiFetch("http://localhost:8080/api/permissions").then((res) => res.json())) as BackendPermission[];
        const nextPermissions: Permissions = JSON.parse(JSON.stringify(initialPermissions));
        backendPermissions.forEach((permission) => {
          const role = mapBackendRoleToPermissionsRole(permission.role);
          if (nextPermissions[role] && permission.page in nextPermissions[role]) {
            nextPermissions[role][permission.page] = permission.allowed;
          }
        });
        setPermissions(nextPermissions);
        const backendSecurity = (await apiFetch("http://localhost:8080/api/security-settings").then((res) => res.json())) as BackendSecuritySettings;
        setSecuritySettings({
          maxPasswordAttempts: backendSecurity.maxPasswordAttempts,
          sessionTimeout: backendSecurity.sessionTimeoutMinutes,
          minPasswordLength: backendSecurity.minPasswordLength,
        });
        setPasswordPolicy({
          requireUppercase: backendSecurity.requireUppercase,
          requireNumbers: backendSecurity.requireNumbers,
          requireSpecialCharacters: backendSecurity.requireSpecialCharacters,
          requireTwoFactor: backendSecurity.requireTwoFactor,
        });
      } catch (err) {
        if (!(err instanceof Error) || err.message !== "Session ended. Please log in again.") {
          setError(err instanceof Error ? err.message : "Failed to fetch users");
        }
      } finally {
        setPermissionsLoading(false);
        setLoading(false);
      }
    };
    fetchData();
  }, [apiFetch]);

  // ── Permissions ─────────────────────────────────────────────────────────────
  const handleTogglePermission = (role: RoleType, feature: FeatureType) =>
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [feature]: !prev[role][feature] },
    }));

  const handleSavePermissions = async () => {
    try {
      setPermissionsSaving(true);
      setError(null);
      const payload = (Object.keys(permissions) as RoleType[]).flatMap((role) =>
        (Object.keys(permissions[role]) as FeatureType[]).map((page) => ({
          role: mapFrontendRoleToBackend(role),
          page,
          allowed: permissions[role][page],
        }))
      );
      await apiFetch("http://localhost:8080/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert("Permissions saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions.");
    } finally {
      setPermissionsSaving(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    try {
      setSecuritySaving(true);
      setError(null);
      await apiFetch("http://localhost:8080/api/security-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: 1,
          maxPasswordAttempts: securitySettings.maxPasswordAttempts,
          sessionTimeoutMinutes: securitySettings.sessionTimeout,
          minPasswordLength: securitySettings.minPasswordLength,
          requireUppercase: passwordPolicy.requireUppercase,
          requireNumbers: passwordPolicy.requireNumbers,
          requireSpecialCharacters: passwordPolicy.requireSpecialCharacters,
          requireTwoFactor: passwordPolicy.requireTwoFactor,
        }),
      });
      alert("Security settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save security settings.");
    } finally {
      setSecuritySaving(false);
    }
  };

  // ── EDIT ────────────────────────────────────────────────────────────────────
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({ fullName: user.name, email: user.email, role: user.role, departmentId: user.department?.id.toString() ?? "", password: "" });
    setShowPassword(false);
    setShowEditModal(true);
    setError(null);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    try {
      setActionLoading(editingUser.id);
      setError(null);
      const updatedApiUser = await UsersAPI.updateUser(editingUser.id, {
        name: formData.fullName,
        email: formData.email,
        role: mapFrontendRoleToBackend(formData.role),
        departmentId: formData.role === "HOD" && formData.departmentId ? parseInt(formData.departmentId) : null,
        status: (editingUser.status === "Active" ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE" | "SUSPENDED",
      });
      if (formData.password.trim()) {
        await UsersAPI.updatePassword(editingUser.id, formData.password.trim());
      }
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? convertApiUserToFrontendUser(updatedApiUser) : u));
      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ fullName: "", email: "", role: "Vice-dean", password: "", departmentId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── BLOCK / UNBLOCK ─────────────────────────────────────────────────────────
  const handleToggleBlockUser = async (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newStatus = user.status === "Active" ? "INACTIVE" : "ACTIVE";
    const label = newStatus === "INACTIVE" ? "block" : "unblock";
    if (!confirm(`Are you sure you want to ${label} ${user.name}?`)) return;
    try {
      setActionLoading(userId);
      setError(null);
      const updatedApiUser = await UsersAPI.updateUserStatus(userId, newStatus as "ACTIVE" | "INACTIVE" | "SUSPENDED");
      setUsers((prev) => prev.map((u) => u.id === userId ? convertApiUserToFrontendUser(updatedApiUser) : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${label} user.`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── DELETE ──────────────────────────────────────────────────────────────────
  const handleDeleteUser = async (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (!confirm(`Are you sure you want to permanently delete ${user.name}? This cannot be undone.`)) return;
    try {
      setActionLoading(userId);
      setError(null);
      await UsersAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── CREATE ──────────────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (formData.role === "HOD" && !formData.departmentId.trim()) {
      setError("HOD users must have a department selected.");
      return;
    }
    try {
      setActionLoading(-1);
      setError(null);
      const newApiUser = await UsersAPI.createUser({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: mapFrontendRoleToBackend(formData.role),
        departmentId: formData.role === "HOD" && formData.departmentId ? parseInt(formData.departmentId) : null,
        status: "ACTIVE",
      });
      setUsers((prev) => [...prev, convertApiUserToFrontendUser(newApiUser)]);
      setShowCreateModal(false);
      setFormData({ fullName: "", email: "", role: "Vice-dean", departmentId: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Tab definitions with icons (matching AdminDashboard pattern) ─────────────
  const TABS = [
    { id: "users",       label: "Users",                    icon: <Users size={13} /> },
    { id: "permissions", label: "Permissions",              icon: <Shield size={13} /> },
    { id: "security",    label: "Security",                 icon: <Lock size={13} /> },
    { id: "report",      label: "Academic Session Report",  icon: <FileText size={13} /> },
  ];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ─── Tab Bar — matches AdminDashboard style with icons ────────────── */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-gray-800 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 w-64"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 cursor-pointer"
            >
              <option value="all">All roles</option>
              <option value="Admin">Admin</option>
              <option value="HOD">HOD</option>
              <option value="Vice-dean">Vice-dean</option>
              <option value="Academic Monitoring Officer">Academic Monitoring Officer</option>
              <option value="Finance Officer">Finance Officer</option>
              <option value="Dean">Dean</option>
            </select>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setError(null);
                setShowPassword(false);
                setFormData({ fullName: "", email: "", role: "Vice-dean", departmentId: "", password: "" });
              }}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-[13px] font-semibold hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create user
            </button>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-300 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border border-current border-t-transparent rounded-full animate-spin text-gray-400 mr-2" />
                <span className="text-gray-500 text-[14px]">Loading…</span>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-700 sticky top-0">
                    <tr>
                      {["ID", "Name", "Email", "Role", "Department", "Status", "Actions"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-2 text-[13px] font-medium text-white whitespace-nowrap ${i >= 6 ? "text-center" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, idx, arr) => {
                        const isRowLoading = actionLoading === user.id;
                        return (
                          <tr
                            key={user.id}
                            className={`transition-colors ${isRowLoading ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"} ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}
                          >
                            <td className="px-3 py-2 text-[12px] text-gray-500 font-mono">{user.id}</td>
                            <td className="px-3 py-2 text-[14px] text-gray-900 font-medium whitespace-nowrap">{user.name}</td>
                            <td className="px-3 py-2 text-[13px] text-gray-600">{user.email}</td>
                            <td className="px-3 py-2"><RoleBadge role={user.role} /></td>
                            <td className="px-3 py-2 text-[13px] text-gray-700">{user.department?.departmentName ?? "—"}</td>
                            <td className="px-3 py-2"><StatusBadge status={user.status} /></td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 justify-center">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  disabled={isRowLoading}
                                  className="px-3 py-1 text-[12px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleBlockUser(user.id)}
                                  disabled={isRowLoading}
                                  className={`px-3 py-1 text-[12px] font-semibold border transition-colors disabled:opacity-50 ${
                                    user.status === "Active"
                                      ? "text-orange-600 border-orange-300 hover:bg-orange-50"
                                      : "text-green-600 border-green-300 hover:bg-green-50"
                                  }`}
                                >
                                  {isRowLoading ? "…" : user.status === "Active" ? "Block" : "Unblock"}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={isRowLoading}
                                  className="px-3 py-1 text-[12px] font-semibold text-red-600 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {isRowLoading ? "…" : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-[13px] font-semibold text-gray-800">
                    Total: <span className="font-bold text-gray-900">{filteredUsers.length}</span> user{filteredUsers.length !== 1 ? "s" : ""}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 flex items-center justify-center text-[12px] font-semibold transition-colors ${
                            currentPage === page
                              ? "bg-gray-800 text-white"
                              : "text-gray-600 border border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PERMISSIONS TAB ── */}
      {activeTab === "permissions" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-300 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[15px] font-bold text-gray-900">Configure page access per role</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Toggle access to system sections for each role.</p>
            </div>
            <button
              onClick={handleSavePermissions}
              disabled={permissionsSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-gray-800 text-white text-[13px] font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {permissionsSaving ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              )}
              {permissionsSaving ? "Saving…" : "Save permissions"}
            </button>
          </div>

          <div className="bg-white border border-gray-300 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[13px] font-medium text-white whitespace-nowrap">Role</th>
                  {["Tariff", "Course Assignment", "Classified", "Integration", "Required", "Sessions", "Teaching Schedule", "Archive"].map((f) => (
                    <th key={f} className="px-3 py-2 text-center text-[12px] font-medium text-white whitespace-nowrap">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {(["Admin", "HOD", "Vice-dean", "Academic Monitoring Officer", "Finance Officer", "Dean"] as RoleType[]).map((role, idx, arr) => (
                  <tr
                    key={role}
                    className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <RoleBadge role={role} />
                    </td>
                    {(["TARIFF", "COURSE_ASSIGNMENT", "CLASSIFIED", "INTEGRATION", "REQUIRED", "SESSIONS", "TEACHING_SCHEDULE", "ARCHIVE"] as FeatureType[]).map((feature) => (
                      <td key={`${role}-${feature}`} className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleTogglePermission(role, feature)}
                          disabled={permissionsLoading || permissionsSaving}
                          className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors disabled:opacity-40 ${
                            permissions[role][feature] ? "bg-gray-700" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                              permissions[role][feature] ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-300 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[15px] font-bold text-gray-900">System-wide security configuration</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Manage authentication rules and password policy.</p>
            </div>
            <button
              onClick={handleSaveSecuritySettings}
              disabled={securitySaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-gray-800 text-white text-[13px] font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {securitySaving ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              )}
              {securitySaving ? "Saving…" : "Save settings"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Authentication */}
            <div className="bg-white border border-gray-300">
              <div className="px-5 py-3 border-b border-gray-300 bg-gray-50">
                <p className="text-[13px] font-bold text-gray-900">Authentication</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                {[
                  { label: "Max password attempts", desc: "Account locked after N failed logins", key: "maxPasswordAttempts", suffix: "attempts", min: 1 },
                  { label: "Session timeout", desc: "Idle sessions logged out automatically", key: "sessionTimeout", suffix: "min", min: 1 },
                  { label: "Min password length", desc: "Users must use at least this many characters", key: "minPasswordLength", suffix: "chars", min: 4 },
                ].map(({ label, desc, key, suffix, min }, i, arr) => (
                  <div key={key} className={`flex items-center justify-between gap-3 ${i < arr.length - 1 ? "pb-4 border-b border-gray-200" : ""}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={min}
                        value={securitySettings[key as keyof typeof securitySettings]}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, [key]: Number(e.target.value) })}
                        className="w-14 border border-gray-300 px-2 py-1 text-[13px] text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-gray-500"
                      />
                      <span className="text-[11px] text-gray-500">{suffix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Password policy */}
            <div className="bg-gray-800 border border-gray-700">
              <div className="px-5 py-3 border-b border-gray-700">
                <p className="text-[13px] font-bold text-white">Password policy</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                {[
                  { label: "Require uppercase letters", desc: "At least one A–Z character", key: "requireUppercase" },
                  { label: "Require numbers", desc: "At least one 0–9 digit", key: "requireNumbers" },
                  { label: "Require special characters", desc: "At least one symbol (!@#$…)", key: "requireSpecialCharacters" },
                  { label: "Two-factor authentication", desc: "Require an additional verification step", key: "requireTwoFactor" },
                ].map(({ label, desc, key }, i, arr) => (
                  <div key={key} className={`flex items-center justify-between gap-3 ${i < arr.length - 1 ? "pb-4 border-b border-gray-700" : ""}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-100">{label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPasswordPolicy({ ...passwordPolicy, [key]: !passwordPolicy[key as keyof typeof passwordPolicy] })}
                      className={`relative inline-flex h-4 w-8 flex-shrink-0 items-center rounded-full transition-colors ${
                        passwordPolicy[key as keyof typeof passwordPolicy] ? "bg-white" : "bg-gray-600"
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full shadow transition-transform ${
                        passwordPolicy[key as keyof typeof passwordPolicy] ? "translate-x-4 bg-gray-800" : "translate-x-0.5 bg-white"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === "report" && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-gray-50 border border-gray-300">
            <div className="px-6 py-3 flex flex-wrap gap-4 items-end border-b border-gray-300">
              {/* Department */}
              <div>
                <label className={labelCls}>Department</label>
                <select
                  value={reportDeptFilter}
                  onChange={(e) => { setReportDeptFilter(e.target.value); setReportLecturerId(""); }}
                  className="px-3 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 cursor-pointer min-w-[160px]"
                >
                  {deptOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {/* Lecturer */}
              <div>
                <label className={labelCls}>Lecturer</label>
                <select
                  value={reportLecturerId}
                  onChange={(e) => setReportLecturerId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 cursor-pointer min-w-[180px]"
                >
                  <option value="">All lecturers</option>
                  {lecturersForSelect.map((l) => <option key={l.id} value={String(l.id)}>{l.lecturerName}</option>)}
                </select>
              </div>
              {/* Semester toggle */}
              <div>
                <label className={labelCls}>Semester</label>
                <div className="flex gap-2">
                  {["1", "2"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setReportSemester((p) => (p === s ? "" : s))}
                      className={`px-4 py-2 text-[12px] font-semibold border transition-colors ${
                        reportSemester === s
                          ? "bg-gray-300 text-gray-900 border-gray-400"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Period */}
              <div>
                <label className={labelCls}>Period</label>
                <select
                  value={reportPeriodFilter}
                  onChange={(e) => setReportPeriodFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 cursor-pointer min-w-[150px]"
                >
                  {["All time", "This month", "This quarter", "This semester"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              {/* Actions */}
              <div className="ml-auto flex gap-2 items-end">
                <button
                  onClick={() => void fetchReportSessions()}
                  disabled={reportLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {reportLoading ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : null}
                  {reportLoading ? "Loading…" : "Refresh"}
                </button>
                <button
                  onClick={() => printReportTable(filteredReportRows)}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-gray-400 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                  Print PDF
                </button>
                <button
                  onClick={exportReportCsv}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="h-1.5 bg-gray-800" />
          </div>

          {reportError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {reportError}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-gray-300 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  {["Lecturer", "Dept", "Course", "Sem", "Date", "Start", "End", "Hours", "Group", "Type", "Ch."].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-[13px] font-medium text-white whitespace-nowrap ${i >= 3 ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {reportLoading ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-[14px]">
                        <div className="w-5 h-5 border border-current border-t-transparent rounded-full animate-spin" />
                        Loading sessions…
                      </div>
                    </td>
                  </tr>
                ) : filteredReportRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                      No rows match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredReportRows.map((row, idx, arr) => {
                    const mins = row.startTime && row.endTime
                      ? timeToMinutes(row.endTime) - timeToMinutes(row.startTime) : 0;
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}
                      >
                        <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap font-medium">{reportRowLecturerName(row)}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-600">{reportRowDepartment(row) || "—"}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-900">{row.courseName ?? "—"}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-700 text-center">{row.semester ?? "—"}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-500 font-mono text-center whitespace-nowrap">{row.sessionDate ?? "—"}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 font-mono text-center whitespace-nowrap">{row.startTime ?? "—"}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 font-mono text-center whitespace-nowrap">{row.endTime ?? "—"}</td>
                        <td className="px-3 py-2 text-[13px] font-bold text-gray-900 text-center font-mono">{formatMinutes(mins)}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-700 text-center">{row.groupCode ?? "—"}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-700 text-center">{row.sessionType ?? "—"}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{row.chapters ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {!reportLoading && filteredReportRows.length > 0 && (
              <div className="flex items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="font-semibold text-gray-800 text-[13px]">
                  Showing <span className="font-bold text-gray-900">{filteredReportRows.length}</span> row(s)
                  <span className="text-gray-500 font-normal"> — {reportSessions.length} loaded from API</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editingUser && (
        <UserDirectoryModal
          title={`Edit user — ${editingUser.name}`}
          onClose={() => { setShowEditModal(false); setEditingUser(null); setError(null); setFormData({ fullName: "", email: "", role: "Vice-dean", password: "", departmentId: "" }); }}
          onSave={handleSaveEditUser}
          saveLabel="Save changes"
          saving={actionLoading === editingUser.id}
          error={error}
        >
          <UserFormFields
            isEdit
            formData={formData}
            setFormData={setFormData}
            departments={departments}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </UserDirectoryModal>
      )}

      {/* ── CREATE MODAL ── */}
      {showCreateModal && (
        <UserDirectoryModal
          title="Create new user"
          onClose={() => { setShowCreateModal(false); setError(null); setFormData({ fullName: "", email: "", role: "Vice-dean", departmentId: "", password: "" }); }}
          onSave={handleCreateUser}
          saveLabel="Save user"
          saving={actionLoading === -1}
          error={error}
        >
          <UserFormFields
            isEdit={false}
            formData={formData}
            setFormData={setFormData}
            departments={departments}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </UserDirectoryModal>
      )}
    </div>
  );
};

export default UsersDirectory;