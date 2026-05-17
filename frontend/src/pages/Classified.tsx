"use client";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { X } from "lucide-react";
import {
  FALLBACK_ANNUAL_HOURS,
  getAnnualDefaultHours,
  getSemesterRequiredMinutesFromLecturer,
} from "@/lib/lecturerRequiredMinutes";

interface Classification {
  id: number;
  lecturerId: number;
  lecturerName: string;
  semester: string;
  courseIds: string;
  groupIds: string;
  sessionIds?: string;
  departmentId: number;
  departmentName: string;
  classifiedStatus: "PENDING" | "VALIDATED" | "RETURNED";
  createdAt: string;
  updatedAt: string;
  cmHour: number;
  tdHour: number;
  tpHour: number;
  coreCm: number;
  coreTd: number;
  coreTp: number;
  electiveCm: number;
  electiveTd: number;
  electiveTp: number;
}

interface Compilation {
  id: number;
  lecturerId: number;
  departmentId: number;
}

interface RequiredOverride {
  id: number;
  lecturerId: number;
  requiredHours: number; // additive annual hours stored in DB
}

interface Lecturer {
  id: number;
  lecturerName: string;
  department: string;
  grade: string;
}

// ── Formatting helpers ───────────────────────────────────────────────────────
const fmt = (totalMinutes: number | undefined, missing: boolean): string => {
  if (missing) return "—";
  if (!totalMinutes || totalMinutes === 0) return "0H";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}H`;
  return `${h}h ${m}min`;
};

const fmtExtra = (minutes: number): string => {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const formatted = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return minutes >= 0 ? `+${formatted}` : `-${formatted}`;
};

const weighted = (cm: number, td: number, tp: number): number =>
  Math.round(cm * 1.5 + td + tp);

interface SemesterData {
  coreCm: number; coreTd: number; coreTp: number;
  electiveCm: number; electiveTd: number; electiveTp: number;
}

const EMPTY_SEMESTER: SemesterData = {
  coreCm: 0, coreTd: 0, coreTp: 0, electiveCm: 0, electiveTd: 0, electiveTp: 0,
};

/**
 * Prefer core/elective breakdown from the API. When course type was missing so only
 * cmHour/tdHour/tpHour were filled, fold those aggregates into Core so the summary
 * matches the list row (same totals as CompilationService weighted math).
 */
function semesterDataFromClassification(rec: Classification): SemesterData {
  const aggCm = rec.cmHour ?? 0;
  const aggTd = rec.tdHour ?? 0;
  const aggTp = rec.tpHour ?? 0;
  let coreCm = rec.coreCm ?? 0;
  let electiveCm = rec.electiveCm ?? 0;
  let coreTd = rec.coreTd ?? 0;
  let electiveTd = rec.electiveTd ?? 0;
  let coreTp = rec.coreTp ?? 0;
  let electiveTp = rec.electiveTp ?? 0;

  let u = aggCm - coreCm - electiveCm;
  if (u > 0) coreCm += u;
  u = aggTd - coreTd - electiveTd;
  if (u > 0) coreTd += u;
  u = aggTp - coreTp - electiveTp;
  if (u > 0) coreTp += u;

  return { coreCm, coreTd, coreTp, electiveCm, electiveTd, electiveTp };
}

const Classified = () => {
  const { language } = useLanguage();
  const { apiFetch } = useAuth();
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetailLecturer, setSelectedDetailLecturer] = useState("");
  const [selectedDetailSemester, setSelectedDetailSemester] = useState("");
  const [selectedRow, setSelectedRow] = useState<Classification | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestSemesterSuccess, setRequestSemesterSuccess] = useState(false);
  const [requestSemesterError, setRequestSemesterError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileSuccess, setCompileSuccess] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  const [compiledLecturerIds, setCompiledLecturerIds] = useState<Set<number>>(new Set());
  // Stores only the *additive annual* override hours from the DB
  const [requiredOverrides, setRequiredOverrides] = useState<Record<number, number>>({});

  // ── Fetch classifications ────────────────────────────────────────────────
  useEffect(() => {
    const fetchClassifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("http://localhost:8080/api/classifications");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: Classification[] = await res.json();
        setClassifications(json);
      } catch (err: any) {
        if (err.message !== "Session ended. Please log in again.") {
          setError(err.message ?? "Failed to load classifications");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClassifications();
  }, [apiFetch]);

  // ── Fetch compilations, required overrides, and lecturers ───────────────
  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const [compRes, reqRes, lectRes] = await Promise.all([
          apiFetch("http://localhost:8080/api/compilations"),
          apiFetch("http://localhost:8080/api/required"),
          apiFetch("http://localhost:8080/api/lecturers"),
        ]);
        if (compRes.ok) {
          const json: Compilation[] = await compRes.json();
          setCompiledLecturerIds(new Set(json.map((c) => c.lecturerId)));
        }
        if (reqRes.ok) {
          const json: RequiredOverride[] = await reqRes.json();
          setRequiredOverrides(
            Object.fromEntries(json.map((r) => [r.lecturerId, r.requiredHours]))
          );
        }
        if (lectRes.ok) {
          const json: Lecturer[] = await lectRes.json();
          setLecturers(json);
        }
      } catch {
        // non-critical
      }
    };
    fetchSetupData();
  }, [apiFetch]);

  /** Only validated rows appear in the table; compile logic uses these same rows. */
  const validatedClassifications = useMemo(
    () => classifications.filter((c) => c.classifiedStatus === "VALIDATED"),
    [classifications]
  );

  useEffect(() => {
    const id = selectedRow?.id;
    if (id === undefined) return;
    if (!validatedClassifications.some((c) => c.id === id)) setSelectedRow(null);
  }, [validatedClassifications, selectedRow?.id]);

  // ── Grade/required helpers ───────────────────────────────────────────────
  const getLecturerGrade = (lecturerId: number): string | null =>
    lecturers.find((l) => l.id === lecturerId)?.grade ?? null;

  // ── Lecturer options ─────────────────────────────────────────────────────
  const lecturerOptions: { id: number; name: string }[] = Array.from(
    new Map(validatedClassifications.map((c) => [c.lecturerId, c.lecturerName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredData = validatedClassifications.filter((c) => {
    const matchLecturer = !selectedDetailLecturer || c.lecturerId === Number(selectedDetailLecturer);
    const matchSemester = !selectedDetailSemester || c.semester === selectedDetailSemester;
    return matchLecturer && matchSemester;
  });

  const handleRowClick = (record: Classification) => {
    setSelectedRow((prev) => (prev?.id === record.id ? null : record));
    setCompileSuccess(false);
    setCompileError(null);
    setRequestSemesterSuccess(false);
    setRequestSemesterError(null);
  };

  // ── Per-lecturer derived data ────────────────────────────────────────────
  const lecturerRecords = selectedRow
    ? validatedClassifications.filter((c) => c.lecturerId === selectedRow.lecturerId)
    : [];

  const s1Record = lecturerRecords.find((c) => c.semester === "1");
  const s2Record = lecturerRecords.find((c) => c.semester === "2");
  const hasS1 = !!s1Record;
  const hasS2 = !!s2Record;
  const bothSemesters = hasS1 && hasS2;
  const missingSemester = !hasS1 ? "1" : !hasS2 ? "2" : null;

  const s1: SemesterData = s1Record ? semesterDataFromClassification(s1Record) : EMPTY_SEMESTER;
  const s2: SemesterData = s2Record ? semesterDataFromClassification(s2Record) : EMPTY_SEMESTER;

  const s1CoreWeighted     = hasS1 ? weighted(s1.coreCm, s1.coreTd, s1.coreTp) : 0;
  const s1ElectiveWeighted = hasS1 ? weighted(s1.electiveCm, s1.electiveTd, s1.electiveTp) : 0;
  const s1Total            = s1CoreWeighted + s1ElectiveWeighted;

  const s2CoreWeighted     = hasS2 ? weighted(s2.coreCm, s2.coreTd, s2.coreTp) : 0;
  const s2ElectiveWeighted = hasS2 ? weighted(s2.electiveCm, s2.electiveTd, s2.electiveTp) : 0;
  const s2Total            = s2CoreWeighted + s2ElectiveWeighted;

  // ── Required hours for the selected lecturer (minutes per semester; same as compilations backend) ──
  const isOverridden = selectedRow ? requiredOverrides[selectedRow.lecturerId] !== undefined : false;
  const semesterRequiredMinutes = selectedRow
    ? getSemesterRequiredMinutesFromLecturer(
        getLecturerGrade(selectedRow.lecturerId),
        requiredOverrides[selectedRow.lecturerId] ?? 0
      )
    : Math.round((FALLBACK_ANNUAL_HOURS / 2) * 60);

  const gradeAnnualDefault  = selectedRow
    ? getAnnualDefaultHours(getLecturerGrade(selectedRow.lecturerId))
    : FALLBACK_ANNUAL_HOURS;
  const annualOverrideVal = selectedRow ? (requiredOverrides[selectedRow.lecturerId] ?? 0) : 0;

  const s1Extra = hasS1 ? s1Total - semesterRequiredMinutes : null;
  const s2Extra = hasS2 ? s2Total - semesterRequiredMinutes : null;

  const isAlreadyCompiled = selectedRow
    ? compiledLecturerIds.has(selectedRow.lecturerId)
    : false;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRequestSemester = async () => {
    if (!selectedRow || !missingSemester) return;
    setRequesting(true);
    setRequestSemesterSuccess(false);
    setRequestSemesterError(null);
    try {
      const res = await apiFetch("http://localhost:8080/api/classifications/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturerId: selectedRow.lecturerId, semester: missingSemester }),
      });
      const raw = await res.text();
      let data: { error?: string; hodNotifiedCount?: number } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setRequestSemesterError(data.error ?? (raw || `Request failed (HTTP ${res.status})`));
        return;
      }
      setRequestSemesterSuccess(true);
      setTimeout(() => setRequestSemesterSuccess(false), 5000);
    } catch (err) {
      setRequestSemesterError(err instanceof Error ? err.message : "Network error — could not reach the server.");
    } finally {
      setRequesting(false);
    }
  };

  const handleCompile = async () => {
    if (!selectedRow || !bothSemesters || isAlreadyCompiled) return;
    if (selectedRow.classifiedStatus !== "VALIDATED") return;
    setCompiling(true);
    setCompileSuccess(false);
    setCompileError(null);
    try {
      const res = await apiFetch("http://localhost:8080/api/classifications/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturerId: selectedRow.lecturerId }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setCompileError(msg || `HTTP Error ${res.status}`);
        return;
      }
      setCompiledLecturerIds((prev) => new Set(prev).add(selectedRow.lecturerId));
      setCompileSuccess(true);
      setTimeout(() => setCompileSuccess(false), 4000);
    } catch {
      setCompileError("Network error — could not reach the server.");
    } finally {
      setCompiling(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const statusBadge = (status: Classification["classifiedStatus"]) => {
    const map = {
      PENDING:   "bg-yellow-100 text-yellow-800 border-yellow-300",
      VALIDATED: "bg-green-100  text-green-800  border-green-300",
      RETURNED:  "bg-red-100    text-red-800    border-red-300",
    };
    return (
      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${map[status]}`}>
        {status}
      </span>
    );
  };

  const rowTotal    = (c: Classification) => fmt(c.cmHour + c.tdHour + c.tpHour, false);
  const cell        = (value: number, hasSem: boolean) => fmt(value, !hasSem);
  const weightedCell = (cm: number, td: number, tp: number, hasSem: boolean) =>
    hasSem ? fmt(weighted(cm, td, tp), false) : "—";
  const totalCell   = (value: number, hasSem: boolean) => hasSem ? fmt(value, false) : "—";

  const extraCellClass = (extra: number | null) => {
    if (extra === null) return "text-gray-300";
    if (extra > 0)  return "text-green-700 font-bold";
    if (extra < 0)  return "text-red-600 font-bold";
    return "text-gray-700 font-bold";
  };

  const compileButtonContent = () => {
    if (compiling) return {
      icon: <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />,
      label: "Compiling…",
    };
    if (isAlreadyCompiled) return {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      label: "Compiled",
    };
    return {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      label: "Compile",
    };
  };

  const compileDisabled   = !bothSemesters || isAlreadyCompiled || compiling;
  const compileButtonClass = compileDisabled
    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
    : "bg-gray-800 text-white hover:bg-gray-700 cursor-pointer";
  const compileTooltip = isAlreadyCompiled
    ? "Already compiled"
    : !bothSemesters
    ? `Semester ${missingSemester} data required`
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ─── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-300">
        <div className="px-6 py-2 flex items-center justify-between border-b border-gray-300">
          <div className="flex items-center gap-4">
            <label className="text-[14px] font-semibold text-gray-900">Lecturer:</label>
            <select
              value={selectedDetailLecturer}
              onChange={(e) => setSelectedDetailLecturer(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-[14px] text-gray-900 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <option value="">All Lecturers</option>
              {lecturerOptions.map((l) => (
                <option key={l.id} value={String(l.id)}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDetailSemester((p) => (p === "1" ? "" : "1"))}
              className={`px-4 py-2 text-[12px] font-semibold border transition-colors ${
                selectedDetailSemester === "1"
                  ? "bg-gray-300 text-gray-900 border-gray-400"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              SEMESTER 1
            </button>
            <button
              onClick={() => setSelectedDetailSemester((p) => (p === "2" ? "" : "2"))}
              className={`px-4 py-2 text-[12px] font-semibold border transition-colors ${
                selectedDetailSemester === "2"
                  ? "bg-gray-300 text-gray-900 border-gray-400"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              SEMESTER 2
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-gray-800" />
      </div>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white overflow-x-auto border border-gray-300">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border border-current border-t-transparent rounded-full animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500 text-[14px]">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-red-500 text-[14px]">Error: {error}</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-200 sticky top-0">
                <tr>
                  {["Date", "Semester", "Lecturer", "Status", "Department", "CM", "TD", "TP", "Total"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-[14px] font-medium text-white whitespace-nowrap ${i >= 5 ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                      {validatedClassifications.length === 0
                        ? "No validated classifications yet. Rows appear here after status is VALIDATED."
                        : "No validated classifications match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, idx, arr) => (
                    <tr
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                      className={`cursor-pointer transition-colors ${
                        selectedRow?.id === record.id ? "bg-blue-100" : "hover:bg-gray-50"
                      } ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}
                    >
                      <td className="px-3 py-2 text-[13px] text-gray-500 whitespace-nowrap">
                        {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 whitespace-nowrap">{record.semester}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 whitespace-nowrap">{record.lecturerName}</td>
                      <td className="px-3 py-2">{statusBadge(record.classifiedStatus)}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900">{record.departmentName}</td>
                      <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{fmt(record.cmHour, false)}</td>
                      <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{fmt(record.tdHour, false)}</td>
                      <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{fmt(record.tpHour, false)}</td>
                      <td className="px-3 py-2 text-[14px] font-bold text-gray-900 text-center font-mono">{rowTotal(record)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
              <p className="font-semibold text-gray-800 text-[13px]">
                Total Records:{" "}
                <span className="text-[14px] font-bold text-gray-900">{filteredData.length}</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* ─── Side Panel ──────────────────────────────────────────────────── */}
      {selectedRow && (
        <div className="fixed top-24 bottom-0 right-0 w-full sm:w-[700px] bg-white border-l border-gray-300 shadow-lg overflow-y-auto z-40">

          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {selectedRow.lecturerName} — Volume Summary
              </h2>
              <p className="text-[12px] text-gray-500 mt-0.5">{selectedRow.departmentName}</p>
            </div>
            <button onClick={() => setSelectedRow(null)} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-700 text-white">
                    <th className="border border-gray-500 px-3 py-2 text-left w-28" />
                    <th colSpan={2} className="border border-gray-500 px-3 py-2 text-center font-semibold">
                      Semester 1
                      {!hasS1 && <span className="ml-1 text-[10px] font-normal opacity-60">(no data)</span>}
                    </th>
                    <th colSpan={2} className="border border-gray-500 px-3 py-2 text-center font-semibold">
                      Semester 2
                      {!hasS2 && <span className="ml-1 text-[10px] font-normal opacity-60">(no data)</span>}
                    </th>
                  </tr>
                  <tr className="bg-gray-600 text-white">
                    <th className="border border-gray-500 px-3 py-2" />
                    <th className="border border-gray-500 px-3 py-2 text-center font-semibold">Core</th>
                    <th className="border border-gray-500 px-3 py-2 text-center font-semibold">Elective</th>
                    <th className="border border-gray-500 px-3 py-2 text-center font-semibold">Core</th>
                    <th className="border border-gray-500 px-3 py-2 text-center font-semibold">Elective</th>
                  </tr>
                </thead>
                <tbody>
                  {/* CM */}
                  <tr className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                      CM <span className="text-[10px] text-gray-400 font-normal">×1.5</span>
                    </td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{cell(s1.coreCm, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{cell(s1.electiveCm, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{cell(s2.coreCm, hasS2)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{cell(s2.electiveCm, hasS2)}</td>
                  </tr>
                  {/* TD */}
                  <tr className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">TD</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{cell(s1.coreTd, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{cell(s1.electiveTd, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{cell(s2.coreTd, hasS2)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{cell(s2.electiveTd, hasS2)}</td>
                  </tr>
                  {/* TP */}
                  <tr className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">TP</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{cell(s1.coreTp, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{cell(s1.electiveTp, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{cell(s2.coreTp, hasS2)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{cell(s2.electiveTp, hasS2)}</td>
                  </tr>
                  {/* Weighted sub-totals */}
                  <tr className="bg-gray-100">
                    <td className="border border-gray-300 px-3 py-2 font-bold text-gray-900">TOTALS</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-bold font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{weightedCell(s1.coreCm, s1.coreTd, s1.coreTp, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-bold font-mono ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{weightedCell(s1.electiveCm, s1.electiveTd, s1.electiveTp, hasS1)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-bold font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{weightedCell(s2.coreCm, s2.coreTd, s2.coreTp, hasS2)}</td>
                    <td className={`border border-gray-300 px-3 py-2 text-center font-bold font-mono ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{weightedCell(s2.electiveCm, s2.electiveTd, s2.electiveTp, hasS2)}</td>
                  </tr>
                  {/* Grand total per semester */}
                  <tr className="bg-white">
                    <td className="border border-gray-300 px-3 py-2 font-bold text-gray-900">TOTAL</td>
                    <td colSpan={2} className={`border border-gray-300 px-3 py-2 text-center font-bold font-mono text-[15px] ${!hasS1 ? "text-gray-300" : "text-gray-900"}`}>{totalCell(s1Total, hasS1)}</td>
                    <td colSpan={2} className={`border border-gray-300 px-3 py-2 text-center font-bold font-mono text-[15px] ${!hasS2 ? "text-gray-300" : "text-gray-900"}`}>{totalCell(s2Total, hasS2)}</td>
                  </tr>

                  {/* REQUIRED — per semester = annual default / 2 */}
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-3 py-2 font-bold text-blue-800">
                      REQUIRED
                     
                    </td>
                    <td colSpan={2} className="border border-gray-300 px-3 py-2 text-center font-bold font-mono text-[15px] text-blue-700">
                      {fmt((gradeAnnualDefault / 2) * 60, false)}
                    </td>
                    <td colSpan={2} className="border border-gray-300 px-3 py-2 text-center font-bold font-mono text-[15px] text-blue-700">
                      {fmt((gradeAnnualDefault / 2) * 60, false)}
                    </td>
                  </tr>

                  {/* OVERRIDE — additive override / 2 per semester, only shown when overridden */}
                  <tr className={isOverridden ? "bg-amber-50" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-3 py-2 font-bold text-amber-700">
                      OVERRIDE
                      
                    </td>
                    <td colSpan={2} className={`border border-gray-300 px-3 py-2 text-center font-mono text-[14px] ${isOverridden ? "text-amber-700 font-bold" : "text-gray-300"}`}>
                      {isOverridden ? `+${fmt((annualOverrideVal / 2) * 60, false)}` : "—"}
                    </td>
                    <td colSpan={2} className={`border border-gray-300 px-3 py-2 text-center font-mono text-[14px] ${isOverridden ? "text-amber-700 font-bold" : "text-gray-300"}`}>
                      {isOverridden ? `+${fmt((annualOverrideVal / 2) * 60, false)}` : "—"}
                    </td>
                  </tr>

                  {/* EXTRA — compared against per-semester required */}
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-bold text-gray-900">EXTRA</td>
                    <td colSpan={2} className={`border border-gray-300 px-3 py-2 text-center font-mono text-[15px] ${extraCellClass(s1Extra)}`}>
                      {s1Extra === null ? "—" : fmtExtra(s1Extra)}
                    </td>
                    <td colSpan={2} className={`border border-gray-300 px-3 py-2 text-center font-mono text-[15px] ${extraCellClass(s2Extra)}`}>
                      {s2Extra === null ? "—" : fmtExtra(s2Extra)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Action Buttons ── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">

              {compileSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 rounded text-[13px] text-green-700 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Compilation saved successfully for {selectedRow.lecturerName}.
                </div>
              )}

              {compileError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded text-[13px] text-red-700 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {compileError}
                </div>
              )}

              {requestSemesterSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-[13px] text-emerald-800 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Request sent — your Head of Department was notified to add Semester {missingSemester}.
                </div>
              )}

              {requestSemesterError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded text-[13px] text-red-700 font-semibold">
                  {requestSemesterError}
                </div>
              )}

              <div className="flex items-center gap-3">
                {missingSemester && (
                  <button
                    onClick={handleRequestSemester}
                    disabled={requesting}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {requesting ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                    Request Semester {missingSemester}
                  </button>
                )}

                <div className="relative group">
                  <button
                    onClick={handleCompile}
                    disabled={compileDisabled}
                    className={`flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold transition-colors ${compileButtonClass}`}
                  >
                    {compileButtonContent().icon}
                    {compileButtonContent().label}
                  </button>
                  {compileTooltip && (
                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {compileTooltip}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classified;