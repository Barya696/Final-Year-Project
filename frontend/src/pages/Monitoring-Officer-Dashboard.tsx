"use client";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, LoaderCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"; // ← adjust path if needed
import { getSemesterRequiredMinutesFromLecturer } from "@/lib/lecturerRequiredMinutes";

interface Compilation {
  id: number;
  lecturerId: number;
  departmentId: number;
  s1CoreCm: number;
  s1CoreTd: number;
  s1CoreTp: number;
  s1ElectiveCm: number;
  s1ElectiveTd: number;
  s1ElectiveTp: number;
  s1WeightedTotal: number;
  s1Required: number;
  s1Extra: number;
  s2CoreCm: number;
  s2CoreTd: number;
  s2CoreTp: number;
  s2ElectiveCm: number;
  s2ElectiveTd: number;
  s2ElectiveTp: number;
  s2WeightedTotal: number;
  s2Required: number;
  s2Extra: number;
  combinedTotal: number;
  combinedExtra: number;
  compiledAt: string;
  academicYear: string;
  tarifficationStatus: "PENDING" | "TARIFFIED";
}

interface Lecturer {
  id: number;
  lecturerName: string;
  grade: string;
  department: string;
}

interface Department {
  id: number;
  departmentName: string;
  hod: string;
}

interface RequiredOverrideRow {
  lecturerId: number;
  requiredHours: number;
}

const fmt = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes === 0) return "0H";
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const base = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return totalMinutes < 0 ? `-${base}` : base;
};

const fmtExtra = (minutes: number): string => {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const base = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return minutes >= 0 ? `+${base}` : `-${base}`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const StatusBadge = ({
  status,
}: {
  status: Compilation["tarifficationStatus"];
}) => {
  const styles =
    status === "TARIFFIED"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold border ${styles}`}
    >
      {status === "TARIFFIED" ? "Tariffied" : "Pending"}
    </span>
  );
};

const MonitoringOfficerDashboard = () => {
  // ✅ Use apiFetch from AuthContext — correct key, auto-logout on 401
  const { apiFetch } = useAuth();

  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requiredAdditiveByLecturer, setRequiredAdditiveByLecturer] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ dept: "", lecturer: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: number }>({
    key: "compiledAt",
    dir: -1,
  });
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [deletingCompilation, setDeletingCompilation] = useState(false);
  const [deleteCompilationError, setDeleteCompilationError] = useState<string | null>(null);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // ✅ apiFetch attaches Authorization header automatically
        // and calls logout() + throws if 401 is returned
        const [cRes, lRes, dRes, rRes] = await Promise.all([
          apiFetch("http://localhost:8080/api/compilations"),
          apiFetch("http://localhost:8080/api/lecturers"),
          apiFetch("http://localhost:8080/api/departments"),
          apiFetch("http://localhost:8080/api/required"),
        ]);

        // apiFetch already handles 401 (auto-logout), so only check other errors
        if (!cRes.ok) throw new Error(`Compilations: HTTP ${cRes.status}`);
        if (!lRes.ok) throw new Error(`Lecturers: HTTP ${lRes.status}`);
        if (!dRes.ok) throw new Error(`Departments: HTTP ${dRes.status}`);

        const [cData, lData, dData] = await Promise.all([
          cRes.json(),
          lRes.json(),
          dRes.json(),
        ]);
        setCompilations(cData);
        setLecturers(lData);
        setDepartments(dData);
        if (rRes.ok) {
          const rRows = (await rRes.json()) as RequiredOverrideRow[];
          setRequiredAdditiveByLecturer(
            Object.fromEntries(rRows.map((r) => [r.lecturerId, r.requiredHours]))
          );
        } else {
          setRequiredAdditiveByLecturer({});
        }
      } catch (err: any) {
        // Don't show error if it's the auto-logout 401 throw
        if (err.message !== "Session ended. Please log in again.") {
          setError(err.message ?? "Failed to load data");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiFetch]);

  useEffect(() => {
    setDeleteCompilationError(null);
  }, [selectedRecordId]);

  const lecturerMap = useMemo(
    () => new Map(lecturers.map((l) => [l.id, l])),
    [lecturers]
  );
  const departmentMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d.departmentName])),
    [departments]
  );

  const getLecturer = (id: number) => lecturerMap.get(id);
  const lecturerName = (id: number) =>
    lecturerMap.get(id)?.lecturerName ?? `Lecturer #${id}`;
  const departmentName = (id: number) =>
    departmentMap.get(id) ?? `Dept #${id}`;

  const stats = useMemo(() => {
    const total = compilations.length;
    const pending = compilations.filter(
      (c) => c.tarifficationStatus === "PENDING"
    ).length;
    const tariffied = compilations.filter(
      (c) => c.tarifficationStatus === "TARIFFIED"
    ).length;
    const deptCount = new Set(compilations.map((c) => c.departmentId)).size;
    const lecCount = new Set(compilations.map((c) => c.lecturerId)).size;
    const totalHours = compilations.reduce(
      (sum, c) => sum + (c.combinedTotal ?? 0),
      0
    );
    return { total, pending, tariffied, deptCount, lecCount, totalHours };
  }, [compilations]);

  const deptOptions = useMemo(
    () =>
      Array.from(new Set(compilations.map((c) => c.departmentId))).map(
        (id) => ({ id, label: departmentName(id) })
      ),
    [compilations, departmentMap]
  );

  const lecturerOptions = useMemo(
    () =>
      Array.from(new Set(compilations.map((c) => c.lecturerId))).map((id) => ({
        id,
        label: lecturerName(id),
      })),
    [compilations, lecturerMap]
  );

  const filtered = useMemo(() => {
    return compilations.filter((c) => {
      if (filters.dept && String(c.departmentId) !== filters.dept) return false;
      if (filters.lecturer && String(c.lecturerId) !== filters.lecturer)
        return false;
      if (filters.status && c.tarifficationStatus !== filters.status)
        return false;
      return true;
    });
  }, [compilations, filters]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      let av: any = a[sortConfig.key as keyof Compilation];
      let bv: any = b[sortConfig.key as keyof Compilation];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return -sortConfig.dir;
      if (av > bv) return sortConfig.dir;
      return 0;
    });
    return data;
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedData = sorted.slice(
    (validPage - 1) * PAGE_SIZE,
    validPage * PAGE_SIZE
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }
    );
  };

  const handleDeleteSelectedCompilation = async (record: Compilation) => {
    if (record.tarifficationStatus === "TARIFFIED") return;
    const ref = `COMP-${String(record.id).padStart(5, "0")}`;
    const ok = window.confirm(
      `Delete compilation ${ref} for ${lecturerName(record.lecturerId)}?\n\nThis removes the record from the compilations table. It cannot be undone.`
    );
    if (!ok) return;
    setDeletingCompilation(true);
    setDeleteCompilationError(null);
    try {
      const res = await apiFetch(`http://localhost:8080/api/compilations/${record.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg.trim() || `HTTP ${res.status}`);
      }
      setCompilations((prev) => prev.filter((c) => c.id !== record.id));
      setSelectedRecordId(null);
    } catch (err: unknown) {
      if ((err as Error)?.message !== "Session ended. Please log in again.") {
        setDeleteCompilationError((err as Error)?.message ?? "Delete failed.");
      }
    } finally {
      setDeletingCompilation(false);
    }
  };

  const selectedRecord = useMemo(
    () => compilations.find((c) => c.id === selectedRecordId),
    [compilations, selectedRecordId]
  );

  const extraClass = (v: number) =>
    v > 0 ? "text-emerald-700" : v < 0 ? "text-red-600" : "text-gray-400";

  return (
    <div className="space-y-4">
      {selectedRecord &&
        (() => {
          const lect = getLecturer(selectedRecord.lecturerId);
          const additiveAnnual = requiredAdditiveByLecturer[selectedRecord.lecturerId] ?? 0;
          const semesterReqMin = getSemesterRequiredMinutesFromLecturer(lect?.grade, additiveAnnual);
          const displayS1Extra = selectedRecord.s1WeightedTotal - semesterReqMin;
          const displayS2Extra = selectedRecord.s2WeightedTotal - semesterReqMin;
          const displayCombinedExtra = displayS1Extra + displayS2Extra;

          return (
            <div className="space-y-0">
              <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedRecordId(null)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={15} />
                  Back to list
                </button>
                <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
                  <button
                    type="button"
                    title={
                      selectedRecord.tarifficationStatus === "TARIFFIED"
                        ? "Cannot delete a compilation that is already tariffied."
                        : undefined
                    }
                    disabled={
                      deletingCompilation ||
                      selectedRecord.tarifficationStatus === "TARIFFIED"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteSelectedCompilation(selectedRecord);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 transition-colors"
                  >
                    {deletingCompilation ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} aria-hidden />
                    )}
                    Delete compilation
                  </button>
                  <span className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">
                    Réf. COMP-{String(selectedRecord.id).padStart(5, "0")}
                  </span>
                </div>
              </div>

              {deleteCompilationError ? (
                <div className="mb-4 px-3 py-2 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-sm">
                  {deleteCompilationError}
                </div>
              ) : null}

              <div className="bg-white border border-gray-300 shadow-sm">
                <div className="px-8 pt-5 pb-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
                    I. Identification
                  </p>
                  <div className="grid grid-cols-4 border border-gray-300 divide-x divide-gray-300 mb-5">
                    {[
                      {
                        label: "Enseignant",
                        value: lecturerName(selectedRecord.lecturerId),
                      },
                      {
                        label: "Grade",
                        value: lect?.grade?.replace(/_/g, " ") ?? "—",
                      },
                      {
                        label: "Département",
                        value: departmentName(selectedRecord.departmentId),
                      },
                      {
                        label: "Année académique",
                        value: selectedRecord.academicYear ?? "—",
                      },
                    ].map(({ label, value }, i) => (
                      <div
                        key={label}
                        className={`px-4 py-3 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-1">
                          {label}
                        </p>
                        <p className="text-[14px] font-semibold text-gray-900 leading-snug">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-8 pb-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
                    II. Volume horaire détaillé — S1 &amp; S2
                  </p>
                  <table className="w-full border-collapse text-[13px] mb-5">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 bg-gray-800 text-white px-4 py-2.5 text-left font-semibold w-48 text-[11px] tracking-wider uppercase">
                          Rubrique
                        </th>
                        <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                          S1 — Cours obligatoire
                        </th>
                        <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                          S1 — Électif
                        </th>
                        <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                          S2 — Cours obligatoire
                        </th>
                        <th className="border border-gray-300 bg-gray-600 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                          S2 — Électif
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                          CM{" "}
                          <span className="text-[10px] font-normal text-gray-400 normal-case">
                            ×1.5
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s1CoreCm)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s1ElectiveCm)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s2CoreCm)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s2ElectiveCm)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                          TD
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s1CoreTd)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s1ElectiveTd)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s2CoreTd)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s2ElectiveTd)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                          TP
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s1CoreTp)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s1ElectiveTp)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s2CoreTp)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                          {fmt(selectedRecord.s2ElectiveTp)}
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={5}
                          className="border-t-2 border-b border-gray-300 px-4 py-1.5 bg-gray-100"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            III. Synthèse semestrielle
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                          Total pondéré
                          <div className="text-[10px] font-normal text-gray-400 normal-case">
                            (CM×1.5 + TD + TP)
                          </div>
                        </td>
                        <td
                          colSpan={2}
                          className="border border-gray-200 px-4 py-3 text-center font-bold font-mono text-[15px] text-gray-900"
                        >
                          {fmt(selectedRecord.s1WeightedTotal)}
                        </td>
                        <td
                          colSpan={2}
                          className="border border-gray-200 px-4 py-3 text-center font-bold font-mono text-[15px] text-gray-900"
                        >
                          {fmt(selectedRecord.s2WeightedTotal)}
                        </td>
                      </tr>

                      <tr className="bg-blue-50">
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50">
                          Volume réglementaire
                        </td>
                        <td
                          colSpan={2}
                          className="border border-gray-200 px-4 py-3 text-center font-bold font-mono text-[15px] text-blue-800"
                        >
                          {fmt(semesterReqMin)}
                        </td>
                        <td
                          colSpan={2}
                          className="border border-gray-200 px-4 py-3 text-center font-bold font-mono text-[15px] text-blue-800"
                        >
                          {fmt(semesterReqMin)}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                          Heures supplémentaires
                        </td>
                        <td
                          colSpan={2}
                          className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[15px] ${extraClass(displayS1Extra)}`}
                        >
                          {fmtExtra(displayS1Extra)}
                        </td>
                        <td
                          colSpan={2}
                          className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[15px] ${extraClass(displayS2Extra)}`}
                        >
                          {fmtExtra(displayS2Extra)}
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={5}
                          className="border-t-2 border-b border-gray-300 px-4 py-1.5 bg-gray-100"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            IV. Total combiné (S1 + S2)
                          </span>
                        </td>
                      </tr>

                      <tr className="bg-blue-50">
                        <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50">
                          Total combiné
                          <div className="text-[10px] font-normal text-blue-400 normal-case">
                            S1 + S2
                          </div>
                        </td>
                        <td colSpan={2} className="border border-gray-200 px-4 py-3 text-center">
                          <span className="font-bold font-mono text-[15px] text-blue-900">
                            {fmt(selectedRecord.combinedTotal)}
                          </span>
                        </td>
                        <td colSpan={2} className="border border-gray-200 px-4 py-3 text-center">
                          <span
                            className={`font-bold font-mono text-[15px] ${extraClass(displayCombinedExtra)}`}
                          >
                            {fmtExtra(displayCombinedExtra)}
                          </span>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            extra combiné
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 pt-3 text-[11px] text-gray-400 font-mono">
                <span>
                  COMP-{String(selectedRecord.id).padStart(5, "0")} —{" "}
                  {departmentName(selectedRecord.departmentId)}
                </span>
                <span>
                  S1 : {fmtExtra(displayS1Extra)}&nbsp;&nbsp;|&nbsp;&nbsp;
                  S2 : {fmtExtra(displayS2Extra)}&nbsp;&nbsp;|&nbsp;&nbsp;
                  Combined : {fmt(selectedRecord.combinedTotal)}&nbsp;&nbsp;|&nbsp;&nbsp;
                  <StatusBadge status={selectedRecord.tarifficationStatus} />
                </span>
              </div>
            </div>
          );
        })()}

      {!selectedRecord && (
        <div className="space-y-6">
          {!loading && (
            <div className="flex items-stretch border border-gray-200 bg-white divide-x divide-gray-200 overflow-hidden">
              {[
                { value: stats.total,           label: "Compilations", color: "text-violet-600", dot: "bg-violet-500" },
                { value: fmt(stats.totalHours), label: "Total Hours",  color: "text-violet-500", dot: "bg-violet-400" },
                { value: stats.pending,         label: "Pending",      color: "text-yellow-600", dot: "bg-yellow-400" },
                { value: stats.tariffied,       label: "Tariffied",    color: "text-green-600",  dot: "bg-green-500"  },
                { value: stats.lecCount,        label: "Lecturers",    color: "text-orange-500", dot: "bg-orange-400" },
                { value: stats.deptCount,       label: "Departments",  color: "text-blue-600",   dot: "bg-blue-500"   },
              ].map((s) => (
                <div key={s.label} className="flex-1 flex items-center gap-2 px-3 py-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className={`text-[15px] font-bold leading-none ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-100 border border-gray-300 p-3 flex flex-wrap gap-2 items-center">
            <select
              value={filters.dept}
              onChange={(e) => handleFilterChange("dept", e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-[13px] bg-white min-w-[160px]"
            >
              <option value="">All Departments</option>
              {deptOptions.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.label}</option>
              ))}
            </select>

            <select
              value={filters.lecturer}
              onChange={(e) => handleFilterChange("lecturer", e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-[13px] bg-white min-w-[160px]"
            >
              <option value="">All Lecturers</option>
              {lecturerOptions.map((l) => (
                <option key={l.id} value={String(l.id)}>{l.label}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-[13px] bg-white min-w-[130px]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="TARIFFIED">Tariffied</option>
            </select>

            {(filters.dept || filters.lecturer || filters.status) && (
              <button
                onClick={() => { setFilters({ dept: "", lecturer: "", status: "" }); setCurrentPage(1); }}
                className="px-3 py-1.5 text-[13px] text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-300 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-700">
                  {[
                    { label: "#",             key: "id" },
                    { label: "Lecturer",      key: "lecturerId" },
                    { label: "Department",    key: "departmentId" },
                    { label: "S1 Total",      key: "s1WeightedTotal" },
                    { label: "S2 Total",      key: "s2WeightedTotal" },
                    { label: "Combined",      key: "combinedTotal" },
                    { label: "Academic Year", key: "academicYear" },
                    { label: "Compiled At",   key: "compiledAt" },
                    { label: "Status",        key: "tarifficationStatus" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      onClick={() => col.key && handleSort(col.key)}
                      className={`px-4 py-2 text-left text-[13px] font-medium text-white whitespace-nowrap
                        ${col.key ? "cursor-pointer hover:bg-gray-600 select-none" : ""}`}
                    >
                      {col.label}
                      {col.key && sortConfig.key === col.key && (
                        <span className="ml-1 opacity-70">
                          {sortConfig.dir === 1 ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-[14px]">
                        <LoaderCircle size={18} className="animate-spin" />
                        Loading compilations…
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-red-500 text-[14px]">
                      {error}
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400 text-[14px]">
                      No compilations found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecordId(record.id)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-2 text-[13px] text-gray-500 font-mono">{record.id}</td>
                      <td className="px-4 py-2 text-[14px] text-gray-900 whitespace-nowrap font-medium">
                        {lecturerName(record.lecturerId)}
                      </td>
                      <td className="px-4 py-2 text-[14px] text-gray-900 whitespace-nowrap">
                        {departmentName(record.departmentId)}
                      </td>
                      <td className="px-4 py-2 text-[13px] font-mono text-gray-700">{fmt(record.s1WeightedTotal)}</td>
                      <td className="px-4 py-2 text-[13px] font-mono text-gray-700">{fmt(record.s2WeightedTotal)}</td>
                      <td className="px-4 py-2 text-[14px] font-bold font-mono text-gray-900">{fmt(record.combinedTotal)}</td>
                      <td className="px-4 py-2 text-[13px] text-gray-700">{record.academicYear}</td>
                      <td className="px-4 py-2 text-[13px] text-gray-500 whitespace-nowrap">{formatDate(record.compiledAt)}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={record.tarifficationStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 py-4 bg-gray-50 border-t border-gray-200">
              <p className="text-[13px] font-semibold text-gray-800">
                Total Records:{" "}
                <span className="text-[14px] font-bold text-gray-900">{sorted.length}</span>
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, validPage - 1))}
                  disabled={validPage === 1}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 text-gray-700 text-[12px] font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 flex items-center justify-center text-[12px] font-medium transition-colors ${
                      p === validPage
                        ? "bg-gray-700 text-white border border-gray-700"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, validPage + 1))}
                  disabled={validPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 text-gray-700 text-[12px] font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringOfficerDashboard;