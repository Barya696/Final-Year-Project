"use client";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Trash, Send, CircleCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ─── Types ────────────────────────────────────────────────────────────── */

interface Compilation {
  id: number;
  lecturerId: number;
  departmentId: number;
  compiledAt: string;
  tarifficationStatus: "PENDING" | "TARIFFIED";
  combinedTotal: number;
  combinedExtra: number;
  s1Extra: number;
  s2Extra: number;
}

interface Lecturer {
  id: number;
  lecturerName: string;
  grade: string;
}

interface Department {
  id: number;
  departmentName: string;
}

interface Tariff {
  id: number;
  grade: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

/* ─── Grade map ─────────────────────────────────────────────────────────── */

const GRADE_ABBR: Record<string, string> = {
  PROFESSEUR_TITULAIRE:  "PT",
  PROFESSEUR:            "P",
  PROFESSOR:             "P",
  MAITRE_CONFERENCE:     "MC",
  MAITRE_ASSISTANT:      "MA",
  ASSISTANT:             "A",
  ATTACHE_UNIVERSITAIRE: "AU",
  ATTACHE:               "AU",
};

const toTariffKey = (grade: string | null | undefined): string | null => {
  if (!grade) return null;
  const upper = grade.toUpperCase();
  if (upper.length <= 3) return upper;
  return GRADE_ABBR[upper] ?? null;
};

const gradeLabel = (grade: string | null | undefined): string => {
  if (!grade) return "—";
  return toTariffKey(grade) ?? grade.replace(/_/g, " ");
};

/* ─── Formatters ─────────────────────────────────────────────────────────── */

const fmtMin = (minutes: number | undefined | null): string => {
  if (minutes === undefined || minutes === null) return "—";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const f = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return minutes < 0 ? `-${f}` : f;
};

const fmtExtra = (minutes: number): string => {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const f = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return minutes >= 0 ? `+${f}` : `-${f}`;
};

const fmtCost = (amount: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const extraColor = (min: number) =>
  min > 0 ? "text-emerald-700" : min < 0 ? "text-red-600" : "text-gray-400";

const getStatusClass = (status: "PENDING" | "TARIFFIED") =>
  status === "TARIFFIED"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

/* ─── Main Component ─────────────────────────────────────────────────────── */

const Tariffication = () => {
  const { apiFetch } = useAuth();
  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [lecturers,    setLecturers]    = useState<Lecturer[]>([]);
  const [departments,  setDepartments]  = useState<Department[]>([]);
  const [tariffs,      setTariffs]      = useState<Tariff[]>([]);

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [filters,     setFilters]     = useState({ dept: "", status: "", date: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);

  /* action states */
  const [tariffying,    setTariffying]    = useState(false);
  const [tariffSuccess, setTariffSuccess] = useState(false);
  const [tariffError,   setTariffError]   = useState<string | null>(null);
  const [sentId,        setSentId]        = useState<number | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  /* ── Fetch ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cR, lR, dR, tR] = await Promise.all([
          apiFetch("http://localhost:8080/api/compilations"),
          apiFetch("http://localhost:8080/api/lecturers"),
          apiFetch("http://localhost:8080/api/departments"),
          apiFetch("http://localhost:8080/api/tariffs"),
        ]);
        if (!cR.ok) throw new Error(`Compilations: HTTP ${cR.status}`);
        if (!lR.ok) throw new Error(`Lecturers: HTTP ${lR.status}`);
        if (!dR.ok) throw new Error(`Departments: HTTP ${dR.status}`);
        if (!tR.ok) throw new Error(`Tariffs: HTTP ${tR.status}`);
        const [cD, lD, dD, tD] = await Promise.all([cR.json(), lR.json(), dR.json(), tR.json()]);
        setCompilations(cD);
        setLecturers(lD);
        setDepartments(dD);
        setTariffs(tD);
      } catch (e: any) {
        if (e.message !== "Session ended. Please log in again.") {
          setError(e.message || "Unable to load records.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiFetch]);

  /* ── Maps ── */
  const lecturerMap   = useMemo(() => new Map(lecturers.map(l  => [l.id, l])),              [lecturers]);
  const departmentMap = useMemo(() => new Map(departments.map(d => [d.id, d.departmentName])), [departments]);
  const tariffByGrade = useMemo(() => new Map(tariffs.map(t    => [t.grade.toUpperCase(), t])), [tariffs]);

  const getLecturer       = (id: number) => lecturerMap.get(id);
  const getLecturerName   = (id: number) => getLecturer(id)?.lecturerName ?? `Lecturer #${id}`;
  const getDepartmentName = (id: number) => departmentMap.get(id) ?? `Department #${id}`;

  /* ── Filter ── */
  const filtered = useMemo(() => compilations.filter(r => {
    const matchDept   = !filters.dept   || r.departmentId === Number(filters.dept);
    const matchStatus = !filters.status || r.tarifficationStatus === filters.status;
    const matchDate   = !filters.date   || (r.compiledAt && r.compiledAt.startsWith(filters.date));
    const matchSearch = !filters.search || [
      getLecturerName(r.lecturerId),
      getDepartmentName(r.departmentId),
      gradeLabel(getLecturer(r.lecturerId)?.grade),
    ].join(" ").toLowerCase().includes(filters.search.toLowerCase());
    return matchDept && matchStatus && matchDate && matchSearch;
  }), [compilations, filters, lecturerMap, departmentMap]);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const validPage     = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((validPage - 1) * rowsPerPage, validPage * rowsPerPage);
  const summaryStats = useMemo(() => ({
    total: compilations.length,
    totalHours: compilations.reduce((sum, row) => sum + (row.combinedTotal || 0), 0),
    pending: compilations.filter((row) => row.tarifficationStatus === "PENDING").length,
    tariffied: compilations.filter((row) => row.tarifficationStatus === "TARIFFIED").length,
    lecCount: new Set(compilations.map((row) => row.lecturerId)).size,
    deptCount: new Set(compilations.map((row) => row.departmentId)).size,
  }), [compilations]);

  const handleFilterChange = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

  /* ── Selected record ── */
  const selectedRecord = useMemo(
    () => compilations.find(r => r.id === selectedId) ?? null,
    [compilations, selectedId]
  );

  const panelLecturer  = selectedRecord ? getLecturer(selectedRecord.lecturerId) : null;
  const panelGrade     = panelLecturer?.grade ?? null;
  const panelTariffKey = toTariffKey(panelGrade);
  const panelTariff: Tariff | undefined = panelTariffKey ? tariffByGrade.get(panelTariffKey) : undefined;

  const extraMinutes   = selectedRecord?.combinedExtra ?? 0;
  const s1ExtraMinutes = selectedRecord?.s1Extra ?? 0;
  const s2ExtraMinutes = selectedRecord?.s2Extra ?? 0;

  const estimatedCostS1    = panelTariff && s1ExtraMinutes > 0 ? (s1ExtraMinutes / 60) * panelTariff.rate : 0;
  const estimatedCostS2    = panelTariff && s2ExtraMinutes > 0 ? (s2ExtraMinutes / 60) * panelTariff.rate : 0;
  const estimatedCostTotal = panelTariff && extraMinutes    > 0 ? (extraMinutes    / 60) * panelTariff.rate : 0;

  const isAlreadyTariffied = selectedRecord?.tarifficationStatus === "TARIFFIED";

  useEffect(() => {
    setTariffSuccess(false);
    setTariffError(null);
    setDeleteConfirm(false);
    setDeleteError(null);
  }, [selectedId]);

  /* ── Apply Tariff ── */
  const handleApplyTariff = async () => {
    if (!selectedRecord || isAlreadyTariffied) return;
    setTariffying(true);
    setTariffSuccess(false);
    setTariffError(null);
    try {
      const res = await apiFetch(
        `http://localhost:8080/api/tariffication/compilation/${selectedRecord.id}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setCompilations(prev =>
        prev.map(c => c.id === selectedRecord.id ? { ...c, tarifficationStatus: "TARIFFIED" } : c)
      );
      setTariffSuccess(true);
      setTimeout(() => setTariffSuccess(false), 5000);
    } catch (e: any) {
      setTariffError(e.message || "Failed to apply tariff.");
    } finally {
      setTariffying(false);
    }
  };

  /* ── Delete Tariffication ── */
  const handleDelete = async () => {
    if (!selectedRecord) return;
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiFetch(
        `http://localhost:8080/api/tariffication/compilation/${selectedRecord.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setCompilations(prev =>
        prev.map(c => c.id === selectedRecord.id ? { ...c, tarifficationStatus: "PENDING" } : c)
      );
      setDeleteConfirm(false);
      setTariffSuccess(false);
    } catch (e: any) {
      setDeleteError(e.message || "Failed to delete tariffication.");
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Send to Dean ── */
  const handleSendToDean = async () => {
    if (!selectedRecord) return;
    setSentId(selectedRecord.id);
    setTimeout(() => setSentId(null), 3000);
    // TODO: POST /api/tariffication/{id}/send
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

    

      {selectedRecord ? (
        /* ══════════════════════════════════════════════════════════════════
           DETAIL VIEW  — administrative document style
        ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-0">

          {/* ── Navigation strip ── */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={15} />
              Back to list
            </button>
            <span className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">
              Réf. COMP-{String(selectedRecord.id).padStart(5, "0")}
            </span>
          </div>

          {/* ── Document shell ── */}
          <div className="bg-white border border-gray-300 shadow-sm">

            
            {/* ── Identification section ── */}
            <div className="px-8 pt-5 pb-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
                I. Identification
              </p>
              <div className="grid grid-cols-4 border border-gray-300 divide-x divide-gray-300 mb-5">
                {[
                  { label: "Enseignant",   value: getLecturerName(selectedRecord.lecturerId) },
                  { label: "Grade",        value: gradeLabel(panelGrade) },
                  { label: "Département",  value: getDepartmentName(selectedRecord.departmentId) },
                  { label: "Taux horaire", value: panelTariff ? fmtCost(panelTariff.rate) : "Non défini" },
                ].map(({ label, value }, i) => (
                  <div key={label} className={`px-4 py-3 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-1">{label}</p>
                    <p className={`text-[14px] font-semibold text-gray-900 leading-snug ${!panelTariff && label === "Taux horaire" ? "text-amber-600" : ""}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Volume & cost table ── */}
            <div className="px-8 pb-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
                II. Détail des heures supplémentaires — S1 &amp; S2
              </p>

              <table className="w-full border-collapse text-[13px] mb-5">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-800 text-white px-4 py-2.5 text-left font-semibold w-48 text-[11px] tracking-wider uppercase">
                      Rubrique
                    </th>
                    <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                      Semestre 1
                    </th>
                    <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                      Semestre 2
                    </th>
                    <th className="border border-gray-300 bg-gray-600 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                      Total combiné
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Volume total */}
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                      Volume total
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                      {fmtMin(selectedRecord.combinedTotal)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                      {fmtMin(selectedRecord.combinedTotal)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[14px] font-bold text-gray-900">
                      {fmtMin(selectedRecord.combinedTotal)}
                    </td>
                  </tr>

                  {/* Heures supplémentaires */}
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                      Heures supplémentaires
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[15px] ${extraColor(s1ExtraMinutes)}`}>
                      {fmtExtra(s1ExtraMinutes)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[15px] ${extraColor(s2ExtraMinutes)}`}>
                      {fmtExtra(s2ExtraMinutes)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[16px] ${extraColor(extraMinutes)}`}>
                      {fmtExtra(extraMinutes)}
                    </td>
                  </tr>

                  {/* Taux appliqué */}
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                      Taux appliqué
                    </td>
                    <td colSpan={3} className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                      {panelTariff
                        ? `${fmtCost(panelTariff.rate)} / heure  —  grade : ${panelTariffKey ?? gradeLabel(panelGrade)}`
                        : <span className="text-amber-600 font-semibold text-[13px]">
                            Aucun tarif défini pour le grade « {panelTariffKey ?? gradeLabel(panelGrade)} »
                          </span>
                      }
                    </td>
                  </tr>

                  {/* Section separator */}
                  <tr>
                    <td colSpan={4} className="border-t-2 border-b border-gray-300 px-4 py-1.5 bg-gray-100">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                        III. Estimation financière
                      </span>
                    </td>
                  </tr>

                  {/* Coût estimé */}
                  <tr className="bg-blue-50">
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50">
                      Coût estimé S1 / S2
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {!panelTariff || s1ExtraMinutes <= 0
                        ? <span className="text-gray-400 text-[13px]">—</span>
                        : <span className="font-bold font-mono text-[14px] text-blue-800">{fmtCost(estimatedCostS1)}</span>
                      }
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {!panelTariff || s2ExtraMinutes <= 0
                        ? <span className="text-gray-400 text-[13px]">—</span>
                        : <span className="font-bold font-mono text-[14px] text-blue-800">{fmtCost(estimatedCostS2)}</span>
                      }
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {panelTariff && extraMinutes > 0
                        ? <span className="font-bold font-mono text-[15px] text-blue-900">{fmtCost(estimatedCostTotal)}</span>
                        : extraMinutes <= 0
                          ? <span className="text-gray-400 text-[13px]">Aucune heure supplémentaire</span>
                          : <span className="text-amber-600 font-semibold text-[13px]">Tarif manquant</span>
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>



            {/* ── Action toolbar ── */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">

              {/* Apply Tariff */}
              <button
                onClick={handleApplyTariff}
                disabled={isAlreadyTariffied || tariffying}
                className={`inline-flex items-center gap-2 px-5 py-2 text-[13px] font-semibold border transition-all ${
                  isAlreadyTariffied
                    ? "bg-emerald-700 text-white border-emerald-700 cursor-not-allowed opacity-80"
                    : tariffying
                      ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                      : "bg-gray-800 text-white border-gray-800 hover:bg-gray-900 active:scale-[0.98]"
                }`}
              >
                {tariffying
                  ? <LoaderCircle size={13} className="animate-spin" />
                  : isAlreadyTariffied
                    ? <CircleCheck size={13} />
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                }
                {tariffying ? "Enregistrement…" : isAlreadyTariffied ? "Tarif appliqué" : "Appliquer le tarif"}
              </button>


              {/* Delete — two-step confirm */}
              {deleteConfirm ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-300 px-3 py-2">
                  <CircleAlert size={13} className="text-red-600 flex-shrink-0" />
                  <span className="text-[12px] text-red-700 font-semibold whitespace-nowrap">
                    Confirmer la suppression ?
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1 px-3 py-1 text-[12px] font-bold bg-red-600 text-white border border-red-700 hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {deleting && <LoaderCircle size={11} className="animate-spin" />}
                    {deleting ? "Suppression…" : "Confirmer"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1 text-[12px] font-semibold bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-400 transition-all active:scale-[0.98]"
                >
                  <Trash size={13} />
                  Supprimer la tarification
                </button>
              )}
            </div>

            {/* ── Feedback banners ── */}
            {(tariffSuccess || tariffError || deleteError) && (
              <div className="px-8 pb-4 bg-gray-50 space-y-2 pt-0">
                {tariffSuccess && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-300 text-[13px] text-emerald-800 font-semibold">
                    <CircleCheck size={13} className="flex-shrink-0 text-emerald-600" />
                    Tarification enregistrée avec succès pour {getLecturerName(selectedRecord.lecturerId)}.
                  </div>
                )}
                {tariffError && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
                    <CircleAlert size={13} className="flex-shrink-0" />
                    {tariffError}
                  </div>
                )}
                {deleteError && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
                    <CircleAlert size={13} className="flex-shrink-0" />
                    {deleteError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Document footer ── */}
          <div className="flex justify-between items-center px-1 pt-3 text-[11px] text-gray-400 font-mono">
            <span>COMP-{String(selectedRecord.id).padStart(5, "0")} — {getDepartmentName(selectedRecord.departmentId)}</span>
            <span>
              S1 : {fmtExtra(s1ExtraMinutes)}&nbsp;&nbsp;|&nbsp;&nbsp;
              S2 : {fmtExtra(s2ExtraMinutes)}&nbsp;&nbsp;|&nbsp;&nbsp;
              Total : {fmtMin(selectedRecord.combinedTotal)}
            </span>
          </div>
        </div>

      ) : (
        /* ══════════════════════════════════════════════════════════════════
           TABLE VIEW
        ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {!loading && (
            <div className="flex items-stretch border border-gray-200 bg-white divide-x divide-gray-200 overflow-hidden">
              {[
                { value: summaryStats.total, label: "Compilations", color: "text-violet-600", dot: "bg-violet-500" },
                { value: fmtMin(summaryStats.totalHours), label: "Total Hours", color: "text-violet-500", dot: "bg-violet-400" },
                { value: summaryStats.pending, label: "Pending", color: "text-yellow-600", dot: "bg-yellow-400" },
                { value: summaryStats.tariffied, label: "Tariffied", color: "text-green-600", dot: "bg-green-500" },
                { value: summaryStats.lecCount, label: "Lecturers", color: "text-orange-500", dot: "bg-orange-400" },
                { value: summaryStats.deptCount, label: "Departments", color: "text-blue-600", dot: "bg-blue-500" },
              ].map((s) => (
                <div key={s.label} className="flex-1 flex items-center gap-2 px-3 py-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className={`text-[15px] font-bold leading-none ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-gray-100 border border-gray-300 p-3 flex flex-wrap gap-2 items-center">
            <select
              value={filters.dept}
              onChange={e => handleFilterChange("dept", e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={String(d.id)}>{d.departmentName}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={e => handleFilterChange("status", e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="TARIFFIED">Tariffied</option>
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={e => handleFilterChange("date", e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-sm bg-white"
            />
            <input
              type="text"
              value={filters.search}
              onChange={e => handleFilterChange("search", e.target.value)}
              placeholder="Search lecturer, department…"
              className="border border-gray-300 px-2 py-1.5 text-sm bg-white ml-auto"
            />
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-300 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                <LoaderCircle className="animate-spin" size={18} />
                <span className="text-[14px]">Chargement…</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-red-500 text-[14px]">Erreur : {error}</p>
              </div>
            ) : (
              <>
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {[
                        { label: "Date",       bg: "#3a4a5c" },
                        { label: "Department", bg: "#4a5568" },
                        { label: "Lecturer",   bg: "#3a4a5c" },
                        { label: "Grade",      bg: "#4a5568" },
                        { label: "S1 Extra",   bg: "#3a4a5c" },
                        { label: "S2 Extra",   bg: "#4a5568" },
                        { label: "Total",      bg: "#3a4a5c" },
                        { label: "Status",     bg: "#4a5568" },
                      ].map(({ label, bg }) => (
                        <th
                          key={label}
                          className="px-4 py-2 text-left text-[13px] font-medium text-white whitespace-nowrap"
                          style={{ backgroundColor: bg }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-500 text-[14px]">
                          No records match the current filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((record, idx) => {
                        const lect      = getLecturer(record.lecturerId);
                        const tariffKey = toTariffKey(lect?.grade ?? null);
                        const tariff    = tariffKey ? tariffByGrade.get(tariffKey) : undefined;
                        const s1Cost    = tariff && record.s1Extra > 0 ? (record.s1Extra / 60) * tariff.rate : null;
                        const s2Cost    = tariff && record.s2Extra > 0 ? (record.s2Extra / 60) * tariff.rate : null;

                        return (
                          <tr
                            key={record.id}
                            onClick={() => setSelectedId(record.id)}
                            className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                              idx !== paginatedData.length - 1 ? "border-b border-gray-200" : ""
                            }`}
                          >
                            <td className="px-4 py-2 text-[13px] text-gray-500 whitespace-nowrap">
                              {record.compiledAt ? formatDate(record.compiledAt) : "—"}
                            </td>
                            <td className="px-4 py-2 text-[14px] text-gray-900">
                              {getDepartmentName(record.departmentId)}
                            </td>
                            <td className="px-4 py-2 text-[14px] text-gray-900 font-medium whitespace-nowrap">
                              {getLecturerName(record.lecturerId)}
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-block bg-gray-100 text-gray-700 px-2.5 py-0.5 text-[12px] font-medium border border-gray-200">
                                {gradeLabel(lect?.grade)}
                              </span>
                            </td>
                            <td className={`px-4 py-2 text-[13px] font-mono font-semibold ${extraColor(record.s1Extra)}`}>
                              {record.tarifficationStatus === "PENDING"
                                ? "—"
                                : s1Cost !== null ? fmtCost(s1Cost) : fmtExtra(record.s1Extra)
                              }
                            </td>
                            <td className={`px-4 py-2 text-[13px] font-mono font-semibold ${extraColor(record.s2Extra)}`}>
                              {record.tarifficationStatus === "PENDING"
                                ? "—"
                                : s2Cost !== null ? fmtCost(s2Cost) : fmtExtra(record.s2Extra)
                              }
                            </td>
                            <td className="px-4 py-2 text-[14px] font-semibold text-gray-900 font-mono">
                              {fmtMin(record.combinedTotal)}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`flex items-center justify-center w-28 px-3 py-1.5 text-[11px] font-semibold border ${getStatusClass(record.tarifficationStatus)}`}>
                                {record.tarifficationStatus === "TARIFFIED" ? "Tariffied" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Rows per page:</label>
                    <select
                      value={rowsPerPage}
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="border border-gray-300 px-2 py-1 text-sm bg-white"
                    >
                      {[5, 8, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <p className="font-semibold text-gray-800 text-[13px]">
                    Total Records: <span className="font-bold text-gray-900">{filtered.length}</span>
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, validPage - 1))}
                      disabled={validPage === 1}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 text-gray-700 text-[12px] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 flex items-center justify-center text-[12px] font-medium transition-colors ${
                          p === validPage
                            ? "bg-gray-700 text-white border border-gray-700"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >{p}</button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, validPage + 1))}
                      disabled={validPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 text-gray-700 text-[12px] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >›</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tariffication;