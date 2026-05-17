"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users, FileText, Settings2, Settings, CheckCircle2,
  User, Building2, AlertCircle, ChevronRight, ArrowRight,
  ArrowLeft, LoaderCircle, RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ReactNode;
}
interface ActivityRow {
  id: number;
  user: string;
  role: string;
  action: string;
  target: string;
  timestamp: string;
  status: "success" | "pending" | "error";
}
interface SystemModule {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "degraded";
  lastChecked: string;
}
interface Compilation  { id: number; tarifficationStatus: "PENDING" | "TARIFFIED"; }
interface Lecturer     { id: number; }
interface Department   { id: number; }
interface Tariff       { id: number; }
interface UserRow      { id: number; }
interface AuditLogItem {
  id: number; action: string; entityName: string;
  entityId: string; performedBy: string; status: string; createdAt: string;
}

const mapAuditStatus = (s: string): "success" | "pending" | "error" => {
  const n = (s || "").toUpperCase();
  if (n.includes("PENDING")) return "pending";
  if (n.includes("ERROR") || n.includes("FAIL")) return "error";
  return "success";
};

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */
const StatusBadge = ({ status }: { status: "active"|"inactive"|"degraded"|"success"|"pending"|"error" }) => {
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: "Active",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-500 border-gray-200" },
    degraded: { label: "Degraded", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    success:  { label: "Success",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
    error:    { label: "Failed",   cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const { label, cls } = map[status] ?? map.inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold border tracking-widest uppercase rounded-sm ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "success" || status === "active" ? "bg-emerald-500" :
        status === "pending" || status === "degraded" ? "bg-amber-500" : "bg-red-500"
      }`} />
      {label}
    </span>
  );
};

const TrendIcon = ({ trend }: { trend: "up"|"down"|"neutral" }) => {
  if (trend === "up")   return <ArrowRight size={11} className="text-emerald-500 flex-shrink-0" />;
  if (trend === "down") return <ArrowLeft  size={11} className="text-red-500 flex-shrink-0" />;
  return <span className="inline-flex w-[11px] shrink-0 items-center justify-center text-[11px] font-bold leading-none text-gray-400">–</span>;
};

const RolePill = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    Admin:    "bg-violet-50 text-violet-700 border-violet-200",
    Lecturer: "bg-blue-50 text-blue-700 border-blue-200",
    Dean:     "bg-indigo-50 text-indigo-700 border-indigo-200",
    System:   "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-sm ${map[role] ?? map.System}`}>
      {role}
    </span>
  );
};

/* ── Donut chart with centre label ── */
const CompilationDonut = ({ tariffied, pending }: { tariffied: number; pending: number }) => {
  const total = tariffied + pending;
  const data = [
    { name: "Tariffied", value: tariffied },
    { name: "Pending",   value: pending   },
  ];
  const COLORS = ["#374151", "#f59e0b"]; // gray-700, amber-400

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="bg-white border border-gray-200 shadow px-3 py-2 text-[12px]">
        <p className="font-bold text-gray-800">{name}</p>
        <p className="text-gray-500">{value} records — {pct}%</p>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={total > 0 ? 3 : 0}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: "-16px" }}>
        <p className="text-[26px] font-bold font-mono text-gray-900 leading-none">{total}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mt-0.5">Total</p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { apiFetch } = useAuth();
  const [activeTab,      setActiveTab]      = useState<"overview"|"activity"|"system">("overview");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all"|"success"|"pending"|"error">("all");
  const [activityPage,   setActivityPage]   = useState(1);
  const [stats,          setStats]          = useState<StatCard[]>([]);
  const [activityRows,   setActivityRows]   = useState<ActivityRow[]>([]);
  const [tariffied,      setTariffied]      = useState(0);
  const [pending,        setPending]        = useState(0);
  const systemModules: SystemModule[] = [];
  const ROWS_PER_PAGE = 6;

  const filteredActivity   = useMemo(() =>
    activityFilter === "all" ? activityRows : activityRows.filter(r => r.status === activityFilter),
  [activityFilter, activityRows]);
  const totalActivityPages = Math.max(1, Math.ceil(filteredActivity.length / ROWS_PER_PAGE));
  const paginatedActivity  = filteredActivity.slice((activityPage - 1) * ROWS_PER_PAGE, activityPage * ROWS_PER_PAGE);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, lRes, dRes, tRes, uRes, aRes] = await Promise.all([
        apiFetch("http://localhost:8080/api/compilations"),
        apiFetch("http://localhost:8080/api/lecturers"),
        apiFetch("http://localhost:8080/api/departments"),
        apiFetch("http://localhost:8080/api/tariffs"),
        apiFetch("http://localhost:8080/api/users"),
        apiFetch("http://localhost:8080/api/admin/audit-logs?page=0&size=40&excludeRead=false"),
      ]);
      if (!cRes.ok || !lRes.ok || !dRes.ok || !tRes.ok || !uRes.ok || !aRes.ok)
        throw new Error("Failed to load admin dashboard data.");

      const [compilations, lecturers, departments, tariffs, users, auditPage] = await Promise.all([
        cRes.json() as Promise<Compilation[]>,
        lRes.json() as Promise<Lecturer[]>,
        dRes.json() as Promise<Department[]>,
        tRes.json() as Promise<Tariff[]>,
        uRes.json() as Promise<UserRow[]>,
        aRes.json() as Promise<{ content: AuditLogItem[] }>,
      ]);

      const tariffiedCount  = compilations.filter(c => c.tarifficationStatus === "TARIFFIED").length;
      const pendingCount    = compilations.filter(c => c.tarifficationStatus === "PENDING").length;
      const compilationTotal = compilations.length;
      const pctTariffied    = compilationTotal > 0 ? Math.round((tariffiedCount / compilationTotal) * 1000) / 10 : 0;
      const pctPending      = compilationTotal > 0 ? Math.round((pendingCount / compilationTotal) * 1000) / 10 : 0;
      const avgPerDept      = departments.length > 0 ? Math.round((lecturers.length / departments.length) * 10) / 10 : 0;
      const lecturerShare   = users.length > 0 ? Math.round((lecturers.length / users.length) * 1000) / 10 : null;

      setTariffied(tariffiedCount);
      setPending(pendingCount);

      setStats([
        {
          label: "Total Lecturers", value: lecturers.length,
          sub: "from lecturers table",
          trend: lecturerShare !== null && lecturerShare >= 40 ? "up" : "neutral",
          trendValue: lecturerShare !== null ? `${lecturerShare}% of registered users` : "Share n/a",
          icon: <User size={14} />,
        },
        {
          label: "Active Departments", value: departments.length,
          sub: "from departments table",
          trend: "neutral",
          trendValue: avgPerDept > 0 ? `~${avgPerDept} lecturers / dept` : "No lecturers yet",
          icon: <Building2 size={14} />,
        },
        {
          label: "Compilations", value: compilationTotal,
          sub: "from compilations table",
          trend: compilationTotal > 0 && pctTariffied >= 50 ? "up" : "neutral",
          trendValue: compilationTotal > 0 ? `${pctTariffied}% tariffied` : "No records yet",
          icon: <FileText size={14} />,
        },
        {
          label: "Tariffied Records", value: tariffiedCount,
          sub: `${tariffs.length} tariffs configured`,
          trend: compilationTotal <= 0 ? "neutral" : pctTariffied >= 66 ? "up" : pctTariffied === 0 ? "down" : "neutral",
          trendValue: compilationTotal > 0 ? `${pctTariffied}% of compilations` : "—",
          icon: <CheckCircle2 size={14} />,
        },
        {
          label: "Pending Approvals", value: pendingCount,
          sub: "awaiting dean review",
          trend: pendingCount === 0 ? "up" : "down",
          trendValue: compilationTotal > 0 ? `${pctPending}% of compilations pending` : "Queue clear",
          icon: <AlertCircle size={14} />,
        },
        {
          label: "Registered Users", value: users.length,
          sub: "from users table",
          trend: "neutral",
          trendValue: lecturers.length > 0
            ? `${Math.round(users.length / Math.max(lecturers.length, 1) * 10) / 10}× users vs lecturers`
            : "Awaiting lecturers",
          icon: <Users size={14} />,
        },
      ]);

      setActivityRows(
        (auditPage.content ?? []).map(item => ({
          id: item.id,
          user: item.performedBy || "System",
          role: "Admin",
          action: item.action || "Updated",
          target: [item.entityName, item.entityId].filter(Boolean).join(" #") || "—",
          timestamp: item.createdAt ? new Date(item.createdAt).toLocaleString() : "—",
          status: mapAuditStatus(item.status),
        }))
      );
    } catch (err: any) {
      if (err?.message !== "Session ended. Please log in again.")
        setError(err?.message ?? "Unable to load admin dashboard.");
      setStats([]); setActivityRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { void loadDashboardData(); }, [loadDashboardData]);

  const TABS = [
    { key: "overview" as const, label: "Overview",      icon: <Settings2 size={13} /> },
    { key: "activity" as const, label: "Activity Log",  icon: <LoaderCircle size={13} /> },
    { key: "system"   as const, label: "System Status", icon: <Settings size={13} /> },
  ];
  const thCls = "px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-gray-300";
  const navigateViaSidebar = (id: string) =>
    window.dispatchEvent(new CustomEvent("app:navigate-sidebar", { detail: id }));

  return (
    <div className="space-y-5">

      {/* ── Tab Nav + Refresh ── */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void loadDashboardData()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-40 mb-px"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
          <AlertCircle size={13} />{error}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-5">

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((card, idx) => {
              const accentColors = [
                { bg: "bg-blue-50",    border: "border-blue-200",   num: "text-blue-700",    icon: "text-blue-400"   },
                { bg: "bg-violet-50",  border: "border-violet-200", num: "text-violet-700",  icon: "text-violet-400" },
                { bg: "bg-cyan-50",    border: "border-cyan-200",   num: "text-cyan-700",    icon: "text-cyan-400"   },
                { bg: "bg-emerald-50", border: "border-emerald-200",num: "text-emerald-700", icon: "text-emerald-400"},
                { bg: "bg-amber-50",   border: "border-amber-200",  num: "text-amber-600",   icon: "text-amber-400"  },
                { bg: "bg-indigo-50",  border: "border-indigo-200", num: "text-indigo-700",  icon: "text-indigo-400" },
              ];
              const accent = accentColors[idx % accentColors.length];
              return (
                <div
                  key={card.label}
                  className={`${accent.bg} ${accent.border} border px-4 py-4 flex flex-col gap-2 hover:shadow-md transition-shadow`}
                >
                  {/* Label + icon */}
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 leading-tight">
                      {card.label}
                    </p>
                    <span className={accent.icon}>{card.icon}</span>
                  </div>

                  {/* Big number */}
                  <p className={`text-[42px] font-black font-mono leading-none ${accent.num}`}>
                    {card.value}
                  </p>

                  {/* Sub + trend */}
                  <div className="flex flex-col gap-0.5 mt-auto pt-1 border-t border-black/5">
                    <div className="flex items-center gap-1">
                      {card.trend && <TrendIcon trend={card.trend} />}
                      <p className="text-[10px] text-gray-400 truncate">{card.sub}</p>
                    </div>
                    {card.trendValue && (
                      <p className={`text-[10px] font-bold truncate ${
                        card.trend === "up"   ? "text-emerald-600" :
                        card.trend === "down" ? "text-red-500"     : "text-gray-400"
                      }`}>
                        {card.trendValue}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Chart + Quick Access ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Donut chart */}
            <div className="bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="w-1 h-4 bg-gray-800 shrink-0" />
                <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Compilation Status</span>
              </div>
              <div className="px-4 py-4">
                <CompilationDonut tariffied={tariffied} pending={pending} />
                {/* Stat row below chart */}
                <div className="grid grid-cols-2 gap-0 border border-gray-200 mt-3 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400">Tariffied</p>
                    <p className="text-[22px] font-bold font-mono text-gray-900 leading-none mt-0.5">{tariffied}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                      {tariffied + pending > 0 ? `${Math.round((tariffied / (tariffied + pending)) * 100)}%` : "—"}
                    </p>
                  </div>
                  <div className="px-4 py-3 bg-white">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400">Pending</p>
                    <p className="text-[22px] font-bold font-mono text-gray-900 leading-none mt-0.5">{pending}</p>
                    <p className="text-[10px] font-bold text-amber-500 mt-0.5">
                      {tariffied + pending > 0 ? `${Math.round((pending / (tariffied + pending)) * 100)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="w-1 h-4 bg-gray-800 shrink-0" />
                <Settings2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Quick Access</span>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: "Manage Users",     navId: "usersDirectory", icon: <Users size={15} />,     desc: "Roles, passwords, permissions" },
                  { label: "Manage Lecturers", navId: "integration",    icon: <User size={15} />,      desc: "Profiles & grade assignments"  },
                  { label: "Manage Tariffs",   navId: "tariff",         icon: <Settings2 size={15} />, desc: "Grade-based hourly rates"      },
                  { label: "Configuration",    navId: "configuration",  icon: <Settings size={15} />,  desc: "University & doc settings"     },
                ].map(item => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => navigateViaSidebar(item.navId)}
                    className="group w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 group-hover:text-blue-600 transition-colors">{item.icon}</span>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-900">{item.label}</p>
                        <p className="text-[11px] text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Activity Preview ── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Recent Activity</p>
              <button
                onClick={() => setActiveTab("activity")}
                className="text-[11px] text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={11} />
              </button>
            </div>
            <div className="border border-gray-200 overflow-hidden shadow-sm">
              <table className="min-w-full">
                <thead>
                  <tr style={{ background: "linear-gradient(90deg, #2d3748 0%, #3a4a5c 100%)" }}>
                    {["Timestamp", "User", "Action", "Target", "Status"].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activityRows.slice(0, 4).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{row.timestamp}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-800">{row.user}</p>
                        <div className="mt-0.5"><RolePill role={row.role} /></div>
                      </td>
                      <td className="px-4 py-3"><span className="text-[12px] font-medium text-gray-700">{row.action}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{row.target}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400 font-mono">
                  Showing {Math.min(4, activityRows.length)} of {activityRows.length} entries
                </p>
                <button
                  onClick={() => setActiveTab("activity")}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                  Full log <ChevronRight size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: ACTIVITY LOG
      ══════════════════════════════════════════════ */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 px-4 py-3 flex gap-2 items-center flex-wrap shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mr-2">Filter:</p>
            {(["all", "success", "pending", "error"] as const).map(f => (
              <button
                key={f}
                onClick={() => { setActivityFilter(f); setActivityPage(1); }}
                className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide border transition-colors rounded-sm ${
                  activityFilter === f
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                }`}
              >{f === "all" ? "All" : f}</button>
            ))}
            <p className="ml-auto text-[11px] text-gray-400 font-mono">
              {filteredActivity.length} record{filteredActivity.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: "linear-gradient(90deg, #2d3748 0%, #3a4a5c 100%)" }}>
                  {["#", "Timestamp", "User", "Role", "Action", "Target", "Status"].map(h => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedActivity.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-[13px]">No records match the current filter.</td></tr>
                ) : paginatedActivity.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-300">{String(row.id).padStart(3, "0")}</td>
                    <td className="px-4 py-3"><span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{row.timestamp}</span></td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-800">{row.user}</td>
                    <td className="px-4 py-3"><RolePill role={row.role} /></td>
                    <td className="px-4 py-3 text-[12px] text-gray-700">{row.action}</td>
                    <td className="px-4 py-3"><span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{row.target}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 font-mono">
                Total: <span className="font-bold text-gray-600">{filteredActivity.length}</span>
              </p>
              <div className="flex gap-1">
                <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage === 1}
                  className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-[13px] rounded-sm">‹</button>
                {Array.from({ length: totalActivityPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setActivityPage(p)}
                    className={`w-7 h-7 flex items-center justify-center border text-[11px] font-bold rounded-sm ${
                      p === activityPage ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>{p}</button>
                ))}
                <button onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))} disabled={activityPage === totalActivityPages}
                  className="w-7 h-7 flex items-center justify-center border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-[13px] rounded-sm">›</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: SYSTEM STATUS
      ══════════════════════════════════════════════ */}
      {activeTab === "system" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-0 border border-gray-200 shadow-sm overflow-hidden">
            {[
              { label: "Operational", value: systemModules.filter(m => m.status === "active").length,   cls: "text-emerald-600", dot: "bg-emerald-500" },
              { label: "Degraded",    value: systemModules.filter(m => m.status === "degraded").length, cls: "text-amber-600",   dot: "bg-amber-500"  },
              { label: "Inactive",    value: systemModules.filter(m => m.status === "inactive").length, cls: "text-gray-400",    dot: "bg-gray-400"   },
            ].map((item, i) => (
              <div key={item.label} className={`px-6 py-4 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} ${i < 2 ? "border-r border-gray-200" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                </div>
                <p className={`text-[32px] font-bold font-mono leading-none ${item.cls}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: "linear-gradient(90deg, #2d3748 0%, #3a4a5c 100%)" }}>
                  {["Module", "Description", "Status", "Last Checked"].map(h => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[13px] text-gray-500">
                  No module status data. Connect a health or telemetry source to populate this table.
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;