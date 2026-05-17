"use client";

import { useEffect, useState } from "react";
import NotificationAPI, {
  type NotificationConfigItem,
  type NotificationFlowRow,
} from "@/services/notificationAPI";

const eventLabels: Record<string, string> = {
  REQUEST_SEMESTER_PENDING:   "Request semester: Pending",
  REQUEST_SEMESTER_FORWARD:   "Request semester: Forward",
  REQUEST_SEMESTER_COMPILED:  "Request semester: Compiled",
  REQUEST_SEMESTER_TARIFFIED: "Request semester: Tariffied",
  LOGIN_FAILED:               "Login failed",
  PASSWORD_CHANGED:           "Password changed",
  CUSTOM:                     "General notification",
};

/* ── Toggle ─────────────────────────────────────────────────────────── */
const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer border transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 ${
      checked ? "bg-gray-800 border-gray-800" : "bg-white border-gray-300"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 mt-[3px] transition-transform ${
        checked ? "translate-x-[18px] bg-white" : "translate-x-[3px] bg-gray-400"
      }`}
    />
  </button>
);

/* ── Main ────────────────────────────────────────────────────────────── */
const NotificationConfig = () => {
  const [configs,  setConfigs]  = useState<NotificationConfigItem[]>([]);
  const [flowRows, setFlowRows] = useState<NotificationFlowRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cfg, flow] = await Promise.all([
          NotificationAPI.getConfig(),
          NotificationAPI.getAdminFlow({ page: 0, size: 10 }),
        ]);
        if (!active) return;
        setConfigs(cfg);
        setFlowRows(flow.content);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load notification configuration");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadData();
    return () => { active = false; };
  }, []);

  const toggleConfigField = async (
    id: number,
    field: "enabled" | "adminOnly",
    value: boolean,
  ) => {
    const prev = configs;
    setConfigs((curr) => curr.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    try {
      const updated = await NotificationAPI.updateConfig(id, { [field]: value });
      setConfigs((curr) => curr.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setConfigs(prev);
      setError(err instanceof Error ? err.message : "Failed to update notification config");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">NOTIFICATION CONFIGURATION</h1>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{error}</div>
      )}

      {/* ── Event Rules ── */}
      <div className="bg-white border border-gray-300">
        {/* section header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="w-1 h-4 bg-gray-800 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Event Rules</span>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-[14px] text-gray-400">
            Loading configuration…
          </div>
        ) : configs.length === 0 ? (
          <div className="px-6 py-10 text-center text-[14px] text-gray-400">
            No notification rules configured.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-700">
              <tr>
                {["Event", "Code", "Enabled", "Admin only"].map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-2 text-[13px] font-medium text-white whitespace-nowrap ${
                      i >= 2 ? "text-center" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {configs.map((cfg, idx) => (
                <tr
                  key={cfg.id}
                  className={`border-b border-gray-200 last:border-b-0 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 text-[13px] font-semibold text-gray-800">
                    {eventLabels[cfg.eventType] ?? cfg.eventType}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-gray-400">
                    {cfg.eventType}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Toggle
                        checked={cfg.enabled}
                        onChange={(v) => void toggleConfigField(cfg.id, "enabled", v)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Toggle
                        checked={cfg.adminOnly}
                        onChange={(v) => void toggleConfigField(cfg.id, "adminOnly", v)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── User Notification Flow ── */}
      <div className="bg-white border border-gray-300">
        {/* section header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="w-1 h-4 bg-gray-800 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">User Notification Flow</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-700">
              <tr>
                {["User", "Department", "Total", "Unread", "Push"].map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-2 text-[13px] font-medium text-white whitespace-nowrap ${
                      i >= 2 ? "text-center" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {flowRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[14px] text-gray-400">
                    No flow data available.
                  </td>
                </tr>
              ) : (
                flowRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-200 last:border-b-0 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-gray-800">{row.name}</p>
                      <p className="text-[11px] text-gray-400">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">{row.department}</td>
                    <td className="px-4 py-3 text-center text-[13px] font-mono text-gray-700">{row.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[12px] font-semibold ${row.unread > 0 ? "text-amber-600" : "text-gray-400"}`}>
                        {row.unread}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[12px] font-semibold ${row.pushEnabled ? "text-green-700" : "text-gray-400"}`}>
                        {row.pushEnabled ? "On" : "Off"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* footer count */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-[13px] font-semibold text-gray-800">
            Total: <span className="font-bold text-gray-900">{flowRows.length}</span>
          </p>
        </div>
      </div>

    </div>
  );
};

export default NotificationConfig;