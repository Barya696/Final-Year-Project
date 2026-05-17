"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Save, Trash, CircleCheck, CircleAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface Lecturer {
  id: number;
  lecturerName: string;
  department: string;
  grade: string;
}

interface RequiredOverride {
  id: number;
  lecturerId: number;
  requiredHours: number;
}

/* ── Default hours by grade abbreviation ── */
const GRADE_ABBR: Record<string, string> = {
  ASSISTANT:             "A",
  ATTACHE_UNIVERSITAIRE: "AU",
  ATTACHE:               "AU",
  MAITRE_ASSISTANT:      "MA",
  MAITRE_CONFERENCE:     "MC",
  PROFESSEUR:            "P",
  PROFESSOR:             "P",
  PROFESSEUR_TITULAIRE:  "PT",
};

const DEFAULT_HOURS: Record<string, number> = {
  A:  200,
  AU: 200,
  MA: 200,
  MC: 180,
  P:  160,
  PT: 160,
};

const toGradeKey = (grade: string | null | undefined): string | null => {
  if (!grade) return null;
  const upper = grade.toUpperCase();
  if (upper.length <= 3) return upper;
  return GRADE_ABBR[upper] ?? null;
};

const getDefaultHours = (grade: string | null | undefined): number | null => {
  const key = toGradeKey(grade);
  return key ? (DEFAULT_HOURS[key] ?? null) : null;
};

const gradeLabel = (grade: string | null | undefined): string => {
  if (!grade) return "—";
  return toGradeKey(grade) ?? grade.replace(/_/g, " ");
};

/* ─────────────────────────────────────────────────────────────────────────── */

const RequiredPage = () => {
  const { apiFetch } = useAuth();
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [overrides, setOverrides] = useState<RequiredOverride[]>([]);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lectRes, requiredRes] = await Promise.all([
          apiFetch("http://localhost:8080/api/lecturers"),
          apiFetch("http://localhost:8080/api/required"),
        ]);
        if (!lectRes.ok) throw new Error(`Lecturers: HTTP ${lectRes.status}`);
        if (!requiredRes.ok) throw new Error(`Required overrides: HTTP ${requiredRes.status}`);
        const [lecturerData, requiredData] = await Promise.all([lectRes.json(), requiredRes.json()]);
        setLecturers(lecturerData);
        setOverrides(requiredData);
        setInputValues(
          Object.fromEntries(
            requiredData.map((row: RequiredOverride) => [row.lecturerId, String(row.requiredHours)])
          )
        );
      } catch (err: any) {
        if (err.message !== "Session ended. Please log in again.") {
          setError(err.message || "Unable to load required hours.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiFetch]);

  const lecturerRows = useMemo(
    () => [...lecturers].sort((a, b) => a.lecturerName.localeCompare(b.lecturerName)),
    [lecturers]
  );

  const getOverride = (lecturerId: number) => overrides.find((r) => r.lecturerId === lecturerId);

  const handleInputChange = (lecturerId: number, value: string) =>
    setInputValues((prev) => ({ ...prev, [lecturerId]: value }));

  const handleSave = async (lecturerId: number) => {
    setError(null);
    setSuccess(null);
    const value = inputValues[lecturerId] ?? "";
    const requiredHours = parseInt(value, 10);
    if (!value || Number.isNaN(requiredHours) || requiredHours <= 0) {
      setError("Enter a valid positive override value.");
      return;
    }
    setSavingIds((prev) => new Set(prev).add(lecturerId));
    try {
      const response = await apiFetch("http://localhost:8080/api/required", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturerId, requiredHours }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Save failed: HTTP ${response.status}`);
      }
      const saved: RequiredOverride = await response.json();
      setOverrides((prev) => [...prev.filter((r) => r.lecturerId !== lecturerId), saved]);
      setSuccess(`Override saved for ${lecturers.find(l => l.id === lecturerId)?.lecturerName ?? `lecturer #${lecturerId}`}.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to save override.");
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(lecturerId); return s; });
    }
  };

  const handleDelete = async (lecturerId: number) => {
    if (deleteConfirm !== lecturerId) { setDeleteConfirm(lecturerId); return; }
    setError(null);
    setSuccess(null);
    setDeletingIds((prev) => new Set(prev).add(lecturerId));
    try {
      const response = await apiFetch(`http://localhost:8080/api/required/lecturer/${lecturerId}`, { method: "DELETE" });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Delete failed: HTTP ${response.status}`);
      }
      setOverrides((prev) => prev.filter((r) => r.lecturerId !== lecturerId));
      setInputValues((prev) => { const next = { ...prev }; delete next[lecturerId]; return next; });
      setDeleteConfirm(null);
      setSuccess(`Override removed for ${lecturers.find(l => l.id === lecturerId)?.lecturerName ?? `lecturer #${lecturerId}`}.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to remove override.");
      setDeleteConfirm(null);
    } finally {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(lecturerId); return s; });
    }
  };

  const overrideCount = overrides.length;

  return (
    <div className="space-y-5">

      {/* ── Feedback banners ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
          <CircleAlert size={13} className="flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-300 text-[13px] text-emerald-800 font-semibold">
          <CircleCheck size={13} className="flex-shrink-0 text-emerald-600" />
          {success}
        </div>
      )}

      {/* ── Document shell ── */}
      <div className="bg-white border border-gray-300 shadow-sm">

        <div className="px-8 pt-5 pb-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
            I. Heures requises par enseignant
          </p>
        </div>

        <div className="px-8 pb-6">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {[
                  { label: "Enseignant",   bg: "#3a4a5c" },
                  { label: "Grade",        bg: "#4a5568" },
                  { label: "Défaut",       bg: "#3a4a5c" },
                  { label: "Override (+h)", bg: "#4a5568" },
                  { label: "Total requis", bg: "#3a4a5c" },
                  { label: "Statut",       bg: "#4a5568" },
                  { label: "Actions",      bg: "#3a4a5c" },
                ].map(({ label, bg }) => (
                  <th
                    key={label}
                    className="px-4 py-2 text-left text-[11px] font-medium text-white whitespace-nowrap tracking-wider uppercase"
                    style={{ backgroundColor: bg }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    <div className="inline-flex items-center gap-2 text-[14px]">
                      <LoaderCircle size={16} className="animate-spin" />
                      Chargement…
                    </div>
                  </td>
                </tr>
              ) : lecturerRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[14px] text-gray-400">
                    No lecturers found.
                  </td>
                </tr>
              ) : (
                lecturerRows.map((lecturer, idx) => {
                  const override     = getOverride(lecturer.id);
                  const defaultHours = getDefaultHours(lecturer.grade);
                  const overrideVal  = override?.requiredHours ?? 0;
                  const effective    = (defaultHours ?? 0) + overrideVal;
                  const value        = inputValues[lecturer.id] ?? "";
                  const saving       = savingIds.has(lecturer.id);
                  const deleting     = deletingIds.has(lecturer.id);
                  const confirmingDelete = deleteConfirm === lecturer.id;

                  return (
                    <tr
                      key={lecturer.id}
                      className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/40"}`}
                    >
                      {/* Lecturer name */}
                      <td className="px-4 py-1.5 text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                        {lecturer.lecturerName}
                      </td>

                      {/* Grade badge */}
                      <td className="px-4 py-1.5">
                        <span className="inline-block bg-gray-100 text-gray-700 px-2.5 py-0.5 text-[12px] font-medium border border-gray-200 font-mono">
                          {gradeLabel(lecturer.grade)}
                        </span>
                      </td>

                      {/* Default hours */}
                      <td className="px-4 py-1.5 font-mono text-[13px] text-gray-500">
                        {defaultHours !== null ? `${defaultHours}h` : <span className="italic text-gray-300">—</span>}
                      </td>

                      {/* Override input */}
                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] text-gray-400 font-mono">+</span>
                          <input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) => handleInputChange(lecturer.id, e.target.value)}
                            placeholder="0"
                            className="w-16 border border-gray-300 bg-white px-2 py-1 text-[13px] text-gray-900 font-mono outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-200 transition-all"
                          />
                          <span className="text-[11px] text-gray-400 font-mono">h</span>
                        </div>
                      </td>

                      {/* Effective total */}
                      <td className="px-4 py-1.5">
                        <span className="font-mono text-[14px] font-bold text-gray-900">
                          {defaultHours !== null ? `${effective}h` : <span className="text-gray-300 font-normal">—</span>}
                        </span>
                        {override && (
                          <span className="ml-1.5 text-[11px] text-emerald-600 font-mono">
                            ({defaultHours}+{overrideVal})
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold border ${
                          override
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${override ? "bg-emerald-500" : "bg-amber-400"}`} />
                          {override ? "Override" : "Default"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(lecturer.id)}
                            disabled={saving || loading || !value}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold border transition-all active:scale-[0.98] ${
                              saving || !value
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : "bg-gray-800 text-white border-gray-800 hover:bg-gray-900"
                            }`}
                          >
                            {saving ? <LoaderCircle size={11} className="animate-spin" /> : <Save size={11} />}
                            {saving ? "Saving…" : "Save"}
                          </button>

                          {override && (
                            confirmingDelete ? (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 px-2 py-1">
                                <CircleAlert size={11} className="text-red-600 flex-shrink-0" />
                                <span className="text-[11px] text-red-700 font-semibold whitespace-nowrap">Confirm?</span>
                                <button
                                  onClick={() => handleDelete(lecturer.id)}
                                  disabled={deleting}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white border border-red-700 hover:bg-red-700 transition-colors disabled:opacity-60"
                                >
                                  {deleting && <LoaderCircle size={10} className="animate-spin" />}
                                  {deleting ? "…" : "Yes"}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-0.5 text-[11px] font-semibold bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDelete(lecturer.id)}
                                disabled={deleting || loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-400 transition-all active:scale-[0.98] disabled:opacity-50"
                              >
                                <Trash size={11} />
                                Remove
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer bar ── */}
        {!loading && (
          <div className="px-8 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-mono">
              {lecturerRows.length} lecturers total &nbsp;·&nbsp; {overrideCount} with override &nbsp;·&nbsp; {lecturerRows.length - overrideCount} using default only
            </p>
            <p className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              Required hours configuration
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequiredPage;