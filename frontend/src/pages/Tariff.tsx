"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Save, CircleCheck, CircleAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const GRADE_ORDER = ["A", "AU", "MA", "MC", "P", "PT"] as const;

const GRADE_LABELS: Record<string, string> = {
  A:  "Assistant",
  AU: "Attaché Universitaire",
  MA: "Maître Assistant",
  MC: "Maître de Conférences",
  P:  "Professeur",
  PT: "Professeur Titulaire",
};

type TariffGrade = (typeof GRADE_ORDER)[number];

interface TariffRecord {
  id?: number;
  grade: TariffGrade;
  rate: number | null;
}

const fmtCost = (amount: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);

const Tariff = () => {
  const { apiFetch } = useAuth();
  const [rows, setRows] = useState<TariffRecord[]>(
    GRADE_ORDER.map((grade) => ({ grade, rate: null }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    const loadTariffs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch("http://localhost:8080/api/tariffs");
        if (!response.ok) throw new Error(`Unable to load tariffs (${response.status})`);
        const data: Array<{ id: number; grade: string; rate: number }> = await response.json();
        setRows(
          GRADE_ORDER.map((grade) => {
            const existing = data.find((t) => t.grade === grade);
            return { grade, id: existing?.id, rate: existing?.rate ?? null };
          })
        );
      } catch (err: any) {
        if (err.message !== "Session ended. Please log in again.") {
          setError(err.message || "Failed to load tariff grades.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadTariffs();
  }, [apiFetch]);

  const updateRow = (grade: TariffGrade, rate: number | null) => {
    setRows((prev) => prev.map((r) => (r.grade === grade ? { ...r, rate } : r)));
  };

  const saveTariff = async (row: TariffRecord) => {
    if (row.rate === null) throw new Error("Enter a tariff rate before saving.");
    const response = await apiFetch(
      row.id ? `http://localhost:8080/api/tariffs/${row.id}` : "http://localhost:8080/api/tariffs",
      {
        method: row.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: row.grade, rate: row.rate }),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to save tariff grade ${row.grade}`);
    }
    return response.json();
  };

  const handleSave = async (grade: TariffGrade) => {
    const row = rows.find((r) => r.grade === grade);
    if (!row) return;
    setError(null);
    setSuccess(null);
    setSavingIds((prev) => new Set(prev).add(grade));
    try {
      const saved = await saveTariff(row);
      setRows((prev) =>
        prev.map((r) => (r.grade === grade ? { ...r, id: saved.id, rate: saved.rate } : r))
      );
      setSuccess(`Tariff for grade ${grade} saved successfully.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || `Failed to save tariff for ${grade}.`);
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(grade); return s; });
    }
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccess(null);
    setSavingAll(true);
    try {
      const results = await Promise.all(
        rows.map((row) => (row.rate !== null ? saveTariff(row) : Promise.resolve(null)))
      );
      setRows((prev) =>
        prev.map((row, i) => {
          const saved = results[i] as { id: number; rate: number } | null;
          return saved ? { ...row, id: saved.id, rate: saved.rate } : row;
        })
      );
      setSuccess("All tariff rates have been saved.");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to save tariff rates.");
    } finally {
      setSavingAll(false);
    }
  };

  const savedCount = rows.filter((r) => r.id !== undefined).length;
  const filledCount = rows.filter((r) => r.rate !== null).length;

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

        {/* Section label */}
        <div className="px-8 pt-5 pb-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
            I. Grille tarifaire
          </p>
        </div>

        {/* Table */}
        <div className="px-8 pb-6">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {[
                  { label: "Grade",        bg: "#3a4a5c" },
                  { label: "Intitulé",     bg: "#4a5568" },
                  { label: "Taux horaire", bg: "#3a4a5c" },
                  { label: "Statut",       bg: "#4a5568" },
                  { label: "Action",       bg: "#3a4a5c" },
                ].map(({ label, bg }) => (
                  <th
                    key={label}
                    className="px-4 py-2.5 text-left text-[11px] font-medium text-white whitespace-nowrap tracking-wider uppercase"
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
                  <td colSpan={5} className="text-center py-14 text-gray-500">
                    <div className="inline-flex items-center gap-2 text-[14px]">
                      <LoaderCircle size={16} className="animate-spin" />
                      Chargement…
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isSaving = savingIds.has(row.grade);
                  const isNew = row.id === undefined;
                  return (
                    <tr key={row.grade} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/40"}`}>

                      {/* Grade badge */}
                      <td className="px-4 py-3">
                        <span className="inline-block bg-gray-100 text-gray-700 px-2.5 py-0.5 text-[12px] font-semibold border border-gray-200 font-mono">
                          {row.grade}
                        </span>
                      </td>

                      {/* Full label */}
                      <td className="px-4 py-3 text-[13px] text-gray-700">
                        {GRADE_LABELS[row.grade] ?? row.grade}
                      </td>

                      {/* Rate input */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <label htmlFor={`tariff-${row.grade}`} className="sr-only">
                            Tariff rate for grade {row.grade}
                          </label>
                          <input
                            id={`tariff-${row.grade}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.rate === null ? "" : row.rate}
                            onChange={(e) =>
                              updateRow(row.grade, e.target.value === "" ? null : Number(e.target.value))
                            }
                            placeholder="0"
                            className="w-36 border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-900 font-mono outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-200 transition-all"
                          />
                          <span className="text-[11px] text-gray-400 font-mono whitespace-nowrap">XAF / h</span>
                        </div>
                        {row.rate !== null && row.rate > 0 && (
                          <p className="mt-1 text-[11px] text-gray-400 font-mono">
                            = {fmtCost(row.rate)} / heure
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold border ${
                          isNew
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {isNew
                            ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          }
                          {isNew ? "New" : "Saved"}
                        </span>
                      </td>

                      {/* Save button */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSave(row.grade)}
                          disabled={isSaving || loading || row.rate === null}
                          className={`inline-flex items-center gap-2 px-4 py-1.5 text-[12px] font-semibold border transition-all active:scale-[0.98] ${
                            isSaving || row.rate === null
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-gray-800 text-white border-gray-800 hover:bg-gray-900"
                          }`}
                        >
                          {isSaving
                            ? <LoaderCircle size={11} className="animate-spin" />
                            : <Save size={11} />
                          }
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer summary bar ── */}
        {!loading && (
          <div className="px-8 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-mono">
              {GRADE_ORDER.length} grades total &nbsp;·&nbsp; {savedCount} configured &nbsp;·&nbsp; {GRADE_ORDER.length - savedCount} pending
            </p>
            <p className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              Tariff configuration
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tariff;