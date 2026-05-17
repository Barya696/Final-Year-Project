"use client";

import { Download, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AuditAPI, { type AuditLogDTO, type AuditStatus, type AuditStatsDTO } from "@/services/auditAPI";

const PAGE_SIZE = 8;

const statusClass = (status: AuditStatus) =>
  status === "SUCCESS" ? "text-green-700" : "text-red-600";

const actionClass = (action: string) => {
  const n = action.toUpperCase();
  if (n === "CREATE") return "text-blue-700";
  if (n === "UPDATE") return "text-amber-700";
  if (n === "DELETE") return "text-red-600";
  if (n === "LOGIN" || n === "LOGOUT") return "text-purple-700";
  return "text-gray-600";
};

const normalizePerformedBy = (raw: string) => {
  const t = raw.trim();
  const embedded = /^AuthPrincipal\[.*?email=([^,\]]+)/.exec(t);
  if (embedded?.[1]) return embedded[1].trim();
  return t;
};

const displayUserFromPerformedBy = (raw: string) => {
  const id = normalizePerformedBy(raw);
  if (!id || id === "UNKNOWN") return id || "—";
  if (id.includes("@")) {
    const local = id.split("@")[0] ?? id;
    return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return id;
};

const userInitialsFromPerformedBy = (raw: string) => {
  const label = displayUserFromPerformedBy(raw);
  if (!label || label === "—") return "?";
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleString();
};

const toIsoDateTimeStart = (d: string) => (d ? `${d}T00:00:00` : undefined);
const toIsoDateTimeEnd = (d: string) => (d ? `${d}T23:59:59` : undefined);

const selectClass =
  "px-3 py-1.5 border border-gray-300 text-[13px] text-gray-900 bg-white hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400";

const Audit = () => {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AuditStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<AuditStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pageData, statsData] = await Promise.all([
          AuditAPI.getAuditLogs({
            page: currentPage - 1,
            size: PAGE_SIZE,
            action: undefined,
            entityName: selectedModule || undefined,
            performedBy: selectedUser || undefined,
            status: selectedStatus || undefined,
            dateFrom: toIsoDateTimeStart(startDate),
            dateTo: toIsoDateTimeEnd(endDate),
            excludeRead: true,
          }),
          AuditAPI.getAuditStats(true),
        ]);
        if (!active) return;
        setLogs(pageData.content);
        setTotalElements(pageData.totalElements);
        setTotalPages(Math.max(pageData.totalPages, 1));
        setStats(statsData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadData();
    return () => { active = false; };
  }, [currentPage, selectedModule, selectedStatus, selectedUser, startDate, endDate]);

  const users = useMemo(
    () => Array.from(new Set(logs.map((l) => l.performedBy).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );
  const modules = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );

  const creates = stats?.actionCounts?.CREATE ?? 0;
  const updates = stats?.actionCounts?.UPDATE ?? 0;
  const deletes = stats?.actionCounts?.DELETE ?? 0;
  const activeModules = Object.keys(stats?.entityCounts ?? {}).length;
  const totalLogs = stats?.totalLogs ?? totalElements;

  const handleReset = () => {
    setSelectedUser("");
    setSelectedModule("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await AuditAPI.exportAuditLogs({
        entityName: selectedModule || undefined,
        performedBy: selectedUser || undefined,
        status: selectedStatus || undefined,
        dateFrom: toIsoDateTimeStart(startDate),
        dateTo: toIsoDateTimeEnd(endDate),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-logs.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{error}</div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">AUDIT LOGS</h1>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border border-green-400 text-green-800 bg-white hover:bg-green-50 transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border border-gray-300 divide-x divide-y sm:divide-y-0 divide-gray-300 bg-white">
        {[
          { label: "Total", value: totalLogs },
          { label: "Creates", value: creates },
          { label: "Updates", value: updates },
          { label: "Deletes", value: deletes },
          { label: "Modules", value: activeModules },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-[22px] font-bold text-gray-900 leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 border border-gray-300">
        <span className="text-[12px] font-semibold text-gray-600">Filter:</span>

        <select
          value={selectedUser}
          onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1); }}
          className={selectClass}
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u} value={u}>{displayUserFromPerformedBy(u)}</option>
          ))}
        </select>

        <select
          value={selectedModule}
          onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
          className={selectClass}
        >
          <option value="">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value as AuditStatus | ""); setCurrentPage(1); }}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
          className={selectClass}
        />
        <span className="text-[12px] text-gray-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
          className={selectClass}
        />

        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-[12px] font-semibold border border-gray-300 text-gray-600 bg-white hover:bg-gray-100 transition-colors"
        >
          Reset
        </button>

        <span className="ml-auto text-[12px] text-gray-500">
          {logs.length} of {totalElements} entries{loading ? " · loading…" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-300 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700 sticky top-0">
            <tr>
              {["User", "Action", "Status", "Module", "Timestamp", "Details", ""].map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-[13px] font-medium text-white whitespace-nowrap text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                  Loading audit logs…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                  No audit logs found for the current filters.
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`border-b border-gray-200 last:border-b-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  {/* User */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                        {userInitialsFromPerformedBy(log.performedBy)}
                      </div>
                      <span className="text-[13px] text-gray-800" title={normalizePerformedBy(log.performedBy)}>
                        {displayUserFromPerformedBy(log.performedBy)}
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2">
                    <span className={`text-[12px] font-bold ${actionClass(log.action)}`}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <span className={`text-[12px] font-semibold ${statusClass(log.status)}`}>
                      {log.status}
                    </span>
                  </td>

                  {/* Module */}
                  <td className="px-3 py-2">
                    <span className="text-[12px] text-gray-600 font-medium">{log.entityName}</span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-3 py-2 text-[12px] font-mono text-gray-500 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>

                  {/* Details */}
                  <td className="px-3 py-2 text-[12px] text-gray-400 max-w-xs truncate">
                    {log.newValue || log.oldValue || `Entity ID: ${log.entityId}`}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer: total + pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-[13px] font-semibold text-gray-800">
            Total: <span className="font-bold text-gray-900">{totalElements}</span>
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-[12px] font-semibold border transition-colors ${
                  currentPage === page
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Audit;