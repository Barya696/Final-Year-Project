"use client";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Download, LoaderCircle, CircleAlert, Archive } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ConfigurationAPI, {
  type ConfigurationPayload,
  type PayrollRowPayload,
} from "@/services/configurationAPI";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   GRADE HELPERS
═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   FORMATTERS
═══════════════════════════════════════════════════════════════════════════ */

const fmtMin = (minutes: number | undefined | null): string => {
  if (minutes === undefined || minutes === null) return "—";
  const abs = Math.abs(minutes);
  const h   = Math.floor(abs / 60);
  const m   = abs % 60;
  const f   = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return minutes < 0 ? `-${f}` : f;
};

const fmtExtra = (minutes: number): string => {
  const abs = Math.abs(minutes);
  const h   = Math.floor(abs / 60);
  const m   = abs % 60;
  const f   = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return minutes >= 0 ? `+${f}` : `-${f}`;
};

const fmtCost = (amount: number): string => {
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(amount));
  return `${n} FCFA`;
};

const fmtDate = (value: string | undefined | null): string => {
  if (!value) return "—";
  const d     = new Date(value);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

const DeanDashboard = () => {
  const { apiFetch } = useAuth();

  /* ── server data ── */
  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [lecturers,    setLecturers]    = useState<Lecturer[]>([]);
  const [departments,  setDepartments]  = useState<Department[]>([]);
  const [tariffs,      setTariffs]      = useState<Tariff[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  /* ── config + payroll rows for the UI detail panel ── */
  const [cfg,         setCfg]         = useState<ConfigurationPayload | null>(null);
  const [payrollRows, setPayrollRows] = useState<PayrollRowPayload[]>([]);

  /* ── UI ── */
  const [filters,     setFilters]     = useState({ dept: "", status: "", date: "", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const [exporting,   setExporting]   = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [tarifficationIdForSelected, setTarifficationIdForSelected] = useState<number | null>(null);
  const [isSelectedArchived, setIsSelectedArchived] = useState(false);

  /* ── load jsPDF once ── */
  useEffect(() => {
    const load = (src: string) =>
      new Promise<void>((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s   = document.createElement("script");
        s.src     = src;
        s.onload  = () => res();
        s.onerror = () => rej(new Error(`Failed: ${src}`));
        document.body.appendChild(s);
      });
    load("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
      .then(() => load("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"))
      .catch(console.error);
  }, []);

  /* ── load config + payroll rows for UI ── */
  useEffect(() => {
    let alive = true;
    Promise.all([ConfigurationAPI.get(), ConfigurationAPI.getPayrollRows()])
      .then(([c, r]) => { if (alive) { setCfg(c); setPayrollRows(r); } })
      .catch(console.error);
    return () => { alive = false; };
  }, []);

  /* ── load compilations / lecturers / departments / tariffs ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cR, lR, dR, tR] = await Promise.all([
          apiFetch("http://localhost:8080/api/compilations"),
          apiFetch("http://localhost:8080/api/lecturers"),
          apiFetch("http://localhost:8080/api/departments"),
          apiFetch("http://localhost:8080/api/tariffs"),
        ]);
        if (!cR.ok) throw new Error(`Compilations: ${cR.status}`);
        if (!lR.ok) throw new Error(`Lecturers: ${lR.status}`);
        if (!dR.ok) throw new Error(`Departments: ${dR.status}`);
        if (!tR.ok) throw new Error(`Tariffs: ${tR.status}`);
        const [cD, lD, dD, tD] = await Promise.all([cR.json(), lR.json(), dR.json(), tR.json()]);
        if (alive) { setCompilations(cD); setLecturers(lD); setDepartments(dD); setTariffs(tD); }
      } catch (e: any) {
        if (alive && e?.message !== "Session ended. Please log in again.")
          setError(e?.message ?? "Unable to load records.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apiFetch]);

  /* ── lookup helpers ── */
  const lecturerMap   = useMemo(() => new Map(lecturers.map(l  => [l.id, l])),                [lecturers]);
  const departmentMap = useMemo(() => new Map(departments.map(d => [d.id, d.departmentName])), [departments]);
  const tariffByGrade = useMemo(() => new Map(tariffs.map(t    => [t.grade.toUpperCase(), t])), [tariffs]);

  const getLecturer     = (id: number) => lecturerMap.get(id);
  const getLecturerName = (id: number) => getLecturer(id)?.lecturerName ?? `Lecturer #${id}`;
  const getDeptName     = (id: number) => departmentMap.get(id) ?? `Department #${id}`;
  const getTariff       = (lecturerId: number): Tariff | undefined => {
    const key = toTariffKey(getLecturer(lecturerId)?.grade ?? null);
    return key ? tariffByGrade.get(key) : undefined;
  };
  const computeCost = (minutes: number, tariff: Tariff | undefined) =>
    tariff && minutes > 0 ? (minutes / 60) * tariff.rate : 0;

  /* ── filter + paginate ── */
  const filtered = useMemo(() =>
    compilations.filter(r => {
      if (filters.dept   && r.departmentId !== Number(filters.dept)) return false;
      if (filters.status && r.tarifficationStatus !== filters.status) return false;
      if (filters.date   && !r.compiledAt?.startsWith(filters.date))  return false;
      if (filters.search) {
        const hay = [getLecturerName(r.lecturerId), getDeptName(r.departmentId), gradeLabel(getLecturer(r.lecturerId)?.grade)]
          .join(" ").toLowerCase();
        if (!hay.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    }),
  [compilations, filters, lecturerMap, departmentMap]);

  useEffect(() => setCurrentPage(1), [filters]);
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

  /* ── selected record helpers ── */
  const selectedRecord = useMemo(() => compilations.find(r => r.id === selectedId) ?? null, [compilations, selectedId]);
  const panelLecturer  = selectedRecord ? getLecturer(selectedRecord.lecturerId) : null;
  const panelGrade     = panelLecturer?.grade ?? null;
  const panelTariffKey = toTariffKey(panelGrade);
  const panelTariff    = selectedRecord ? getTariff(selectedRecord.lecturerId) : undefined;
  const s1ExtraMin     = selectedRecord?.s1Extra      ?? 0;
  const s2ExtraMin     = selectedRecord?.s2Extra      ?? 0;
  const totalMin       = selectedRecord?.combinedTotal ?? 0;
  const s1Cost         = computeCost(s1ExtraMin, panelTariff);
  const s2Cost         = computeCost(s2ExtraMin, panelTariff);
  const grandTotal     = s1Cost + s2Cost;

  /* ── archive state for selected compilation ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      setArchiveError(null);
      setTarifficationIdForSelected(null);
      setIsSelectedArchived(false);
      if (!selectedRecord || selectedRecord.tarifficationStatus !== "TARIFFIED") return;

      try {
        const tRes = await apiFetch(`http://localhost:8080/api/tariffication/compilation/${selectedRecord.id}`);
        if (!tRes.ok) throw new Error("Tariffication record not found for selected compilation.");
        const tariffication = await tRes.json() as { id: number };
        if (!alive) return;
        setTarifficationIdForSelected(tariffication.id);

        const aRes = await apiFetch(`http://localhost:8080/api/archive/tariffication/${tariffication.id}`);
        if (!alive) return;
        if (aRes.ok) {
          const row = await aRes.json() as { archived?: boolean };
          setIsSelectedArchived(Boolean(row.archived));
        } else if (aRes.status === 404) {
          setIsSelectedArchived(false);
        } else {
          throw new Error(`Archive lookup failed (${aRes.status})`);
        }
      } catch (e: any) {
        if (alive && e?.message !== "Session ended. Please log in again.") {
          setArchiveError(e?.message ?? "Failed to load archive status.");
        }
      }
    })();
    return () => { alive = false; };
  }, [selectedRecord, apiFetch]);

  const handleArchiveToggle = async () => {
    if (!selectedRecord) return;
    if (selectedRecord.tarifficationStatus !== "TARIFFIED") {
      setArchiveError("Only tariffied records can be archived.");
      return;
    }
    if (!tarifficationIdForSelected) {
      setArchiveError("Tariffication ID is missing for selected record.");
      return;
    }

    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const url = isSelectedArchived
        ? `http://localhost:8080/api/archive/tariffication/${tarifficationIdForSelected}/unarchive`
        : `http://localhost:8080/api/archive/tariffication/${tarifficationIdForSelected}`;
      const method = isSelectedArchived ? "PUT" : "POST";
      const res = await apiFetch(url, { method });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(body.error ?? body.message ?? `Archive request failed (${res.status})`);
      }
      const row = await res.json() as { archived?: boolean };
      setIsSelectedArchived(Boolean(row.archived));
    } catch (e: any) {
      if (e?.message !== "Session ended. Please log in again.") {
        setArchiveError(e?.message ?? "Archive action failed.");
      }
    } finally {
      setArchiveBusy(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     PDF EXPORT
  ═══════════════════════════════════════════════════════════════════════ */
  const handleExportPDF = async (record: Compilation) => {
    const win = window as any;
    if (!win.jspdf?.jsPDF) {
      alert("PDF library not ready. Please try again in a moment.");
      return;
    }

    setExporting(true);

    /* 1 ── Fetch FRESH config and payroll rows from DB */
    let liveCfg: ConfigurationPayload;
    let liveRows: PayrollRowPayload[];
    try {
      [liveCfg, liveRows] = await Promise.all([
        ConfigurationAPI.get(),
        ConfigurationAPI.getPayrollRows(),
      ]);
    } catch (e) {
      setExporting(false);
      alert(`Could not fetch configuration: ${(e as Error).message}`);
      return;
    }

    /* 2 ── Resolve record data */
    const lect      = getLecturer(record.lecturerId);
    const lecName   = lect?.lecturerName ?? `Lecturer #${record.lecturerId}`;
    const grade     = gradeLabel(lect?.grade);
    const deptName  = getDeptName(record.departmentId);
    const tariff    = getTariff(record.lecturerId);
    const refNo     = `${liveCfg.referencePrefix}/${String(record.id).padStart(3, "0")}-001`;
    const dateStr   = fmtDate(record.compiledAt);
    const cS1       = computeCost(record.s1Extra, tariff);
    const cS2       = computeCost(record.s2Extra, tariff);
    const grandCost = cS1 + cS2;
    const dash      = (n: number) => n > 0 ? fmtCost(n) : "--";

    /* 3 ── Volume/extra formatters for PDF */
    const fmtVolume = (min: number) => {
      const abs = Math.abs(min);
      const h   = Math.floor(abs / 60);
      const m   = abs % 60;
      return h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
    };
    const fmtExtraSign = (min: number) => {
      const abs = Math.abs(min);
      const h   = Math.floor(abs / 60);
      const m   = abs % 60;
      const f   = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
      return min >= 0 ? `+${f}` : `-${f}`;
    };

    /* 4 ── Build PDF */
    const { jsPDF } = win.jspdf;
    const doc       = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, ML = 15, MR = 15, CW = W - ML - MR;
    let y = 12;

    const C = {
      dark:    [45,  55,  72]  as [number, number, number],
      mid:     [74,  85,  104] as [number, number, number],
      bgLight: [248, 248, 248] as [number, number, number],
      bgGray:  [240, 240, 240] as [number, number, number],
      bgFaint: [238, 241, 245] as [number, number, number],
      bgBlue:  [208, 216, 228] as [number, number, number],
      border:  [180, 180, 180] as [number, number, number],
    };

    const setFont = (style: "normal"|"bold"|"italic", size: number, color: [number,number,number]|number = 0) => {
      doc.setFont("times", style).setFontSize(size);
      if (Array.isArray(color)) doc.setTextColor(...color); else doc.setTextColor(color);
    };
    const fillRect = (bg: [number,number,number], rx: number, ry: number, rw: number, rh: number, border?: [number,number,number]) => {
      doc.setFillColor(...bg);
      if (border) { doc.setDrawColor(...border).setLineWidth(0.25); doc.rect(rx, ry, rw, rh, "FD"); }
      else        { doc.rect(rx, ry, rw, rh, "F"); }
    };
    const cell = (text: string, cx: number, cy: number, cw: number, ch: number, bg: [number,number,number], bold: boolean, align: "left"|"center") => {
      fillRect(bg, cx, cy, cw, ch, C.border);
      setFont(bold ? "bold" : "normal", 9, 0);
      const tx = align === "center" ? cx + cw / 2 : cx + 2.5;
      doc.text(text, tx, cy + ch / 2 + 1.5, { align });
    };
    const twoLineCell = (line1: string, line2: string, cx: number, cy: number, cw: number, ch: number) => {
      fillRect([255,255,255], cx, cy, cw, ch, C.border);
      setFont("normal", 9, 0);
      doc.text(line1, cx + cw / 2, cy + ch * 0.38 + 1.5, { align: "center" });
      setFont("normal", 7.5, [100,100,100]);
      doc.text(line2, cx + cw / 2, cy + ch * 0.68 + 1.5, { align: "center" });
    };

    /* ── LETTERHEAD ── */
    setFont("normal", 7.5, [100,100,100]);
    doc.text(liveCfg.republicName.toUpperCase(), W / 2, y, { align: "center" });
    y += 4.5;

    setFont("bold", 9, [30,30,30]);
    doc.text(liveCfg.universityName.toUpperCase(), W / 2, y, { align: "center" });
    y += 5;

    setFont("bold", 15, 0);
    doc.text(liveCfg.facultyName.toUpperCase(), W / 2, y, { align: "center" });
    y += 5.5;

    setFont("normal", 8.5, [60,60,60]);
    doc.text(deptName, W / 2, y, { align: "center" });
    y += 4;

    doc.setDrawColor(...C.dark).setLineWidth(0.8); doc.line(ML, y, W - MR, y);
    doc.setLineWidth(0.25);                        doc.line(ML, y + 1.2, W - MR, y + 1.2);
    y += 6;

    /* ── Document title ── */
    setFont("bold", 11, 0);
    const titleText = liveCfg.documentTitle.toUpperCase();
    doc.text(titleText, W / 2, y, { align: "center", charSpace: 0.6 });
    const tw = doc.getTextWidth(titleText);
    doc.setDrawColor(0).setLineWidth(0.35);
    doc.line(W / 2 - tw / 2, y + 0.7, W / 2 + tw / 2, y + 0.7);
    y += 5;

    setFont("normal", 8.5, [80,80,80]);
    doc.text(`Academic Year ${liveCfg.academicYear}`, W / 2, y, { align: "center" });
    y += 6;

    /* ── Ref / Date bar ── */
    fillRect(C.bgLight, ML, y, CW, 7, [160,160,160]);
    setFont("normal", 8.5, 0);
    const refLabel = `${liveCfg.referenceLabel} `;
    doc.text(refLabel, ML + 3, y + 4.5);
    setFont("bold", 8.5, 0);
    doc.text(refNo, ML + 3 + doc.getTextWidth(refLabel), y + 4.5);

    setFont("normal", 8.5, 0);
    const dateLabel = `${liveCfg.dateLabel} `;
    doc.text(dateLabel, W / 2 - 12, y + 4.5);
    setFont("bold", 8.5, 0);
    doc.text(dateStr, W / 2 - 12 + doc.getTextWidth(dateLabel), y + 4.5);
    y += 11;

    /* ── Identification table ── */
    const LW = CW * 0.28, VW = CW * 0.72, RH = 7;
    const idRows = [
      [liveCfg.lecturerLabel,        lecName],
      [liveCfg.departmentLabel,      deptName],
      [liveCfg.gradeLabel,           grade],
      [liveCfg.groupsLabel,          "—"],
      [liveCfg.referenceNumberLabel, tariff ? `${fmtCost(tariff.rate)} / hr` : "Not defined"],
    ];
    idRows.forEach(([label, value]) => {
      cell(label, ML,      y, LW, RH, C.bgGray,     true,  "left");
      cell(value, ML + LW, y, VW, RH, [255,255,255], false, "left");
      y += RH;
    });
    y += 5;

    /* ── II. Hours breakdown section label ── */
    doc.setFillColor(0).rect(ML, y - 1, 1.3, 6, "F");
    setFont("bold", 8.5, 0);
    doc.text(liveCfg.sectionHoursDetailTitle.toUpperCase(), ML + 4, y + 3.2, { charSpace: 0.3 });
    y += 8;

    const C0 = CW * 0.22, C1 = CW * 0.39, C2 = CW * 0.39;
    const HDR = 6.5, SUB = 5, ROW = 9;

    /* header row 1 */
    fillRect(C.dark, ML,           y, C0, HDR + SUB, C.border);
    fillRect(C.dark, ML + C0,      y, C1, HDR,       C.border);
    fillRect(C.dark, ML + C0 + C1, y, C2, HDR,       C.border);
    setFont("bold", 9, [255,255,255]);
    doc.text(liveCfg.typeLabel,        ML + C0 / 2,           y + (HDR + SUB) / 2 + 1.5, { align: "center" });
    doc.text(liveCfg.semesterOneLabel, ML + C0 + C1 / 2,      y + HDR / 2 + 1.5,         { align: "center" });
    doc.text(liveCfg.semesterTwoLabel, ML + C0 + C1 + C2 / 2, y + HDR / 2 + 1.5,         { align: "center" });
    y += HDR;

    /* header row 2 — sub-header */
    fillRect(C.mid, ML + C0,      y, C1, SUB, C.border);
    fillRect(C.mid, ML + C0 + C1, y, C2, SUB, C.border);
    setFont("bold", 7.5, [220,230,240]);
    doc.text(liveCfg.extraHoursLabel, ML + C0 + C1 / 2,      y + SUB / 2 + 1.3, { align: "center" });
    doc.text(liveCfg.extraHoursLabel, ML + C0 + C1 + C2 / 2, y + SUB / 2 + 1.3, { align: "center" });
    y += SUB;

    /* ── Row 1: Total Volume ── */
    const totalVolLabel  = liveCfg.totalVolumeLabel  ?? "Total Volume";
    const extraHrsLabel  = liveCfg.extraHoursLabel   ?? "Extra Hours";
    const appliedRtLabel = liveCfg.appliedRateLabel  ?? "Applied Rate";

    cell(totalVolLabel, ML, y, C0, ROW, [249,250,251], true, "left");
    twoLineCell(fmtVolume(record.combinedTotal ?? 0), "", ML + C0,      y, C1, ROW);
    twoLineCell(fmtVolume(record.combinedTotal ?? 0), "", ML + C0 + C1, y, C2, ROW);
    y += ROW;

    /* ── Row 2: Extra Hours (coloured) ── */
    cell(extraHrsLabel, ML, y, C0, ROW, [249,250,251], true, "left");
    // S1
    fillRect([255,255,255], ML + C0, y, C1, ROW, C.border);
    setFont("bold", 10, record.s1Extra > 0 ? [5,150,105] : record.s1Extra < 0 ? [220,38,38] : [150,150,150]);
    doc.text(fmtExtraSign(record.s1Extra), ML + C0 + C1 / 2, y + ROW / 2 + 1.5, { align: "center" });
    // S2
    fillRect([255,255,255], ML + C0 + C1, y, C2, ROW, C.border);
    setFont("bold", 10, record.s2Extra > 0 ? [5,150,105] : record.s2Extra < 0 ? [220,38,38] : [150,150,150]);
    doc.text(fmtExtraSign(record.s2Extra), ML + C0 + C1 + C2 / 2, y + ROW / 2 + 1.5, { align: "center" });
    y += ROW;

    /* ── Row 3: Applied Rate (spans S1 + S2 columns) ── */
    cell(appliedRtLabel, ML, y, C0, ROW, [249,250,251], true, "left");
    fillRect([255,255,255], ML + C0, y, C1 + C2, ROW, C.border);
    setFont("normal", 9, 0);
    const rateStr = tariff
      ? `${fmtCost(tariff.rate)} / hr  —  grade: ${grade}`
      : `No tariff defined for grade "${grade}"`;
    doc.text(rateStr, ML + C0 + (C1 + C2) / 2, y + ROW / 2 + 1.5, { align: "center" });
    y += ROW + 5;

    /* ── III. Financial summary section label ── */
    doc.setFillColor(0).rect(ML, y - 1, 1.3, 6, "F");
    setFont("bold", 8.5, 0);
    doc.text((liveCfg.sectionFinancialTitle ?? "III. Financial Estimate").toUpperCase(), ML + 4, y + 3.2, { charSpace: 0.3 });
    y += 8;

    const FRH = 7;
    fillRect(C.dark, ML, y, CW, FRH, C.border);
    setFont("bold", 8.5, [255,255,255]);
    doc.text(liveCfg.financialSummaryTitle.toUpperCase(), ML + 3, y + FRH / 2 + 1.5, { charSpace: 0.5 });
    y += FRH;

    const FL = CW * 0.30, FV = CW * 0.20;
    const finRow = (l1: string, v1: string, l2: string, v2: string) => {
      fillRect([245,245,245], ML,              y, FL, FRH, C.border);
      fillRect([255,255,255], ML + FL,         y, FV, FRH, C.border);
      fillRect([245,245,245], ML + FL + FV,    y, FL, FRH, C.border);
      fillRect([255,255,255], ML + FL*2 + FV,  y, CW - FL*2 - FV, FRH, C.border);
      setFont("bold",   8.5, 0); doc.text(l1, ML + 2.5,             y + FRH / 2 + 1.5);
      setFont("normal", 8.5, 0); doc.text(v1, ML + FL + FV - 2,     y + FRH / 2 + 1.5, { align: "right" });
      setFont("bold",   8.5, 0); doc.text(l2, ML + FL + FV + 2.5,   y + FRH / 2 + 1.5);
      setFont("normal", 8.5, 0); doc.text(v2, ML + CW - 2,          y + FRH / 2 + 1.5, { align: "right" });
      y += FRH;
    };

    finRow(
      `${liveCfg.semesterOneLabel} ${liveCfg.extraHoursLabel}`, dash(cS1),
      `${liveCfg.semesterTwoLabel} ${liveCfg.extraHoursLabel}`, dash(cS2),
    );

    /* combined row */
    [ML, ML+FL, ML+FL+FV, ML+FL*2+FV].forEach((cx, i) => {
      const cw = [FL, FV, FL, CW-FL*2-FV][i];
      fillRect(C.bgFaint, cx, y, cw, FRH, C.border);
    });
    setFont("bold", 8.5, 0);
    doc.text(`${liveCfg.semesterOneLabel} Combined`, ML + 2.5,           y + FRH / 2 + 1.5);
    doc.text(dash(cS1),                              ML + FL + FV - 2,   y + FRH / 2 + 1.5, { align: "right" });
    doc.text(`${liveCfg.semesterTwoLabel} Combined`, ML + FL + FV + 2.5, y + FRH / 2 + 1.5);
    doc.text(dash(cS2),                              ML + CW - 2,        y + FRH / 2 + 1.5, { align: "right" });
    y += FRH;

    /* grand total */
    const GTH = FRH + 1;
    fillRect(C.bgBlue, ML, y, CW, GTH, C.border);
    setFont("bold", 10, 0);
    doc.text("Grand Total (S1 + S2)",                         ML + 2.5, y + GTH / 2 + 1.8);
    doc.text(grandCost > 0 ? fmtCost(grandCost) : "— FCFA",  ML + CW - 2, y + GTH / 2 + 1.8, { align: "right" });
    y += GTH + 5;

    /* ── Remarks ── */
    doc.setDrawColor(...C.border).setLineWidth(0.3);
    doc.rect(ML, y, CW, 18);
    setFont("bold", 8.5, 0);
    doc.text("REMARKS / OBSERVATIONS", ML + 3, y + 4.5, { charSpace: 0.5 });
    doc.setLineDashPattern([0.5, 1], 0);
    doc.setDrawColor(200,200,200).setLineWidth(0.3);
    doc.line(ML + 2, y + 7, ML + CW - 2, y + 7);
    doc.setLineDashPattern([], 0);
    setFont("italic", 8, [140,140,140]);
    doc.text("(To be completed by the Department Head)", ML + 3, y + 12);
    y += 22;

    /* ── Signatures ── */
    y += 12;
    const SCW = CW / 3;
    doc.setDrawColor(0).setLineWidth(0.4);
    doc.line(ML,           y, ML + SCW - 8,     y);
    doc.line(ML + SCW + 4, y, ML + SCW * 2 - 4, y);
    const stampX = ML + SCW * 2 + (SCW - 20) / 2;
    doc.setDrawColor(160,160,160).setLineWidth(0.3);
    doc.rect(stampX, y - 14, 20, 13);
    setFont("normal", 7.5, [200,200,200]);
    doc.text("STAMP", stampX + 10, y - 8.5, { align: "center" });
    y += 4;
    setFont("bold", 8.5, 0);
    doc.text("Lecturer",           ML + SCW * 0.5, y, { align: "center" });
    doc.text("Head of Department", ML + SCW * 1.5, y, { align: "center" });
    doc.text("Dean's Office",      ML + SCW * 2.5, y, { align: "center" });
    y += 4;
    setFont("normal", 8, [80,80,80]);
    doc.text(lecName, ML + SCW * 0.5, y, { align: "center" });
    y += 4;
    setFont("normal", 7.5, [130,130,130]);
    doc.text("Signature & Date", ML + SCW * 0.5, y, { align: "center" });
    doc.text("Signature & Date", ML + SCW * 1.5, y, { align: "center" });
    doc.text("Official Stamp",   ML + SCW * 2.5, y, { align: "center" });
    y += 10;

    /* ── Footer ── */
    doc.setDrawColor(210,210,210).setLineWidth(0.3);
    doc.line(ML, y, W - MR, y);
    y += 4;
    setFont("normal", 7, [150,150,150]);
    doc.text(
      `Official administrative record — ${liveCfg.universityName} · ${liveCfg.facultyName} · ${liveCfg.academicYear}`,
      W / 2, y, { align: "center", charSpace: 0.3 },
    );

    doc.save(`approval-${refNo.replace(/\//g, "-")}.pdf`);
    setExporting(false);
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {selectedRecord ? (
        /* ══════ DETAIL VIEW ══════ */
        <div className="space-y-0">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={15} /> Back to list
            </button>
            <span className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">
              Réf. COMP-{String(selectedRecord.id).padStart(5, "0")}
            </span>
          </div>

          <div className="bg-white border border-gray-300 shadow-sm">
            {/* I. Identification */}
            <div className="px-8 pt-5 pb-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
                {cfg?.sectionIdentificationTitle ?? "I. Identification"}
              </p>
              <div className="grid grid-cols-4 border border-gray-300 divide-x divide-gray-300 mb-5">
                {[
                  { label: cfg?.lecturerLabel        ?? "Lecturer",    value: getLecturerName(selectedRecord.lecturerId) },
                  { label: cfg?.gradeLabel           ?? "Grade",       value: gradeLabel(panelGrade) },
                  { label: cfg?.departmentLabel      ?? "Department",  value: getDeptName(selectedRecord.departmentId) },
                  { label: cfg?.referenceNumberLabel ?? "Tariff Rate", value: panelTariff ? `${fmtCost(panelTariff.rate)} / hr` : "Not defined" },
                ].map(({ label, value }, i) => (
                  <div key={label} className={`px-4 py-3 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-1">{label}</p>
                    <p className="text-[14px] font-semibold leading-snug text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* II. Teaching Hours Detail */}
            <div className="px-8 pb-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2.5">
                {cfg?.sectionHoursDetailTitle ?? "II. Teaching Hours Detail"}
              </p>
              <table className="w-full border-collapse text-[13px] mb-5">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-800 text-white px-4 py-2.5 text-left font-semibold w-44 text-[11px] tracking-wider uppercase">
                      {cfg?.typeLabel ?? "Type"}
                    </th>
                    <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                      {cfg?.semesterOneLabel ?? "Semester 1"}
                    </th>
                    <th className="border border-gray-300 bg-gray-700 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                      {cfg?.semesterTwoLabel ?? "Semester 2"}
                    </th>
                    <th className="border border-gray-300 bg-gray-600 text-white px-4 py-2.5 text-center font-semibold text-[11px] tracking-wider uppercase">
                      {cfg?.combinedTotalLabel ?? "Combined Total"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 — Total Volume */}
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                      {cfg?.totalVolumeLabel ?? "Total Volume"}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                      {fmtMin(totalMin)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                      {fmtMin(totalMin)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[14px] text-gray-900">
                      {fmtMin(totalMin)}
                    </td>
                  </tr>

                  {/* Row 2 — Extra Hours */}
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                      {cfg?.extraHoursLabel ?? "Extra Hours"}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[15px] ${s1ExtraMin > 0 ? "text-emerald-700" : s1ExtraMin < 0 ? "text-red-600" : "text-gray-400"}`}>
                      {fmtExtra(s1ExtraMin)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[15px] ${s2ExtraMin > 0 ? "text-emerald-700" : s2ExtraMin < 0 ? "text-red-600" : "text-gray-400"}`}>
                      {fmtExtra(s2ExtraMin)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-mono font-bold text-[16px] ${(s1ExtraMin + s2ExtraMin) > 0 ? "text-emerald-700" : (s1ExtraMin + s2ExtraMin) < 0 ? "text-red-600" : "text-gray-400"}`}>
                      {fmtExtra(s1ExtraMin + s2ExtraMin)}
                    </td>
                  </tr>

                  {/* Row 3 — Applied Rate */}
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                      {cfg?.appliedRateLabel ?? "Applied Rate"}
                    </td>
                    <td colSpan={3} className="border border-gray-200 px-4 py-3 text-center font-mono text-[13px] text-gray-700">
                      {panelTariff
                        ? `${fmtCost(panelTariff.rate)} / hr  —  grade: ${panelTariffKey ?? gradeLabel(panelGrade)}`
                        : <span className="text-amber-600 font-semibold">No tariff defined for grade "{panelTariffKey ?? gradeLabel(panelGrade)}"</span>
                      }
                    </td>
                  </tr>

                  {/* Section separator — III. Financial Estimate */}
                  <tr>
                    <td colSpan={4} className="border-t-2 border-b border-gray-300 px-4 py-1.5 bg-gray-100">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                        {cfg?.sectionFinancialTitle ?? "III. Financial Estimate"}
                      </span>
                    </td>
                  </tr>

                  {/* Row 4 — Estimated Cost */}
                  <tr className="bg-blue-50">
                    <td className="border border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      {cfg?.estimatedCostLabel ?? "Estimated Cost S1 / S2"}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {!panelTariff || s1ExtraMin <= 0
                        ? <span className="text-gray-400 text-[13px]">—</span>
                        : <span className="font-bold font-mono text-[14px] text-blue-800">{fmtCost(s1Cost)}</span>
                      }
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {!panelTariff || s2ExtraMin <= 0
                        ? <span className="text-gray-400 text-[13px]">—</span>
                        : <span className="font-bold font-mono text-[14px] text-blue-800">{fmtCost(s2Cost)}</span>
                      }
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {panelTariff && grandTotal > 0
                        ? <span className="font-bold font-mono text-[15px] text-blue-900">{fmtCost(grandTotal)}</span>
                        : <span className="text-gray-400 text-[13px]">{grandTotal <= 0 ? "No extra hours" : "Tariff missing"}</span>
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action toolbar */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => void handleExportPDF(selectedRecord)}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-5 py-2 text-[13px] font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {exporting ? <LoaderCircle size={13} className="animate-spin" /> : <Download size={13} />}
                {exporting ? "Generating…" : "Export PDF"}
              </button>
              <button
                type="button"
                onClick={() => void handleArchiveToggle()}
                disabled={archiveBusy || selectedRecord.tarifficationStatus !== "TARIFFIED" || !tarifficationIdForSelected}
                title={isSelectedArchived ? "Click to unarchive this tariffied record" : "Archive this tariffied record"}
                className={`inline-flex items-center gap-2 px-5 py-2 text-[13px] font-semibold border transition-all active:scale-[0.98] disabled:opacity-50 ${
                  isSelectedArchived
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {archiveBusy ? <LoaderCircle size={13} className="animate-spin" /> : <Archive size={13} />}
                {archiveBusy ? "Working…" : isSelectedArchived ? "Archived" : "Archive"}
              </button>
              {!panelTariff && (
                <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-amber-50 border border-amber-300 text-[12px] text-amber-700 font-semibold">
                  <CircleAlert size={12} className="flex-shrink-0" />
                  No tariff for grade "{panelTariffKey ?? gradeLabel(panelGrade)}"
                </div>
              )}
              {archiveError && (
                <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-amber-50 border border-amber-300 text-[12px] text-amber-700 font-semibold">
                  <CircleAlert size={12} className="flex-shrink-0" />
                  {archiveError}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center px-1 pt-3 text-[11px] text-gray-400 font-mono">
            <span>COMP-{String(selectedRecord.id).padStart(5, "0")} — {getDeptName(selectedRecord.departmentId)}</span>
            <span>S1: {fmtExtra(s1ExtraMin)} | S2: {fmtExtra(s2ExtraMin)} | Total: {fmtMin(totalMin)}{panelTariff && grandTotal > 0 ? ` | Grand Total: ${fmtCost(grandTotal)}` : ""}</span>
          </div>
        </div>

      ) : (
        /* ══════ TABLE VIEW ══════ */
        <div className="space-y-6">
        
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

          {/* Filters */}
          <div className="bg-gray-100 border border-gray-300 p-4 flex gap-2 items-center flex-wrap">
            <select
              value={filters.dept}
              onChange={e => setFilters(p => ({ ...p, dept: e.target.value }))}
              className="border border-gray-300 px-2 py-1 text-sm bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={String(d.id)}>{d.departmentName}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              className="border border-gray-300 px-2 py-1 text-sm bg-white"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="TARIFFIED">Tariffied</option>
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={e => setFilters(p => ({ ...p, date: e.target.value }))}
              className="border border-gray-300 px-2 py-1 text-sm bg-white"
            />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="border border-gray-300 px-2 py-1 text-sm bg-white ml-auto"
              placeholder="Search…"
            />
          </div>

          {/* Table */}
          <div className="bg-white overflow-hidden border border-gray-300">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                <LoaderCircle className="animate-spin" size={18} />
                <span className="text-[14px]">Loading records…</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-red-500 text-[14px]">Error: {error}</p>
              </div>
            ) : (
              <>
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {["Date","Department","Lecturer","Grade","Sem 1","Sem 2","Total","Action"].map((h, i) => (
                        <th key={h} className="px-6 py-2 text-left text-[13px] font-medium text-white"
                          style={{ backgroundColor: i % 2 === 0 ? "#3a4a5c" : "#4a5568" }}>
                          {h}
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
                    ) : paginatedData.map((record, idx) => {
                      const t   = getTariff(record.lecturerId);
                      const cS1 = computeCost(record.s1Extra, t);
                      const cS2 = computeCost(record.s2Extra, t);
                      return (
                        <tr
                          key={record.id}
                          onClick={() => setSelectedId(record.id)}
                          className={`cursor-pointer hover:bg-gray-50 transition-colors ${idx !== paginatedData.length - 1 ? "border-b border-gray-200" : ""}`}
                        >
                          <td className="px-6 py-2 text-[14px] text-gray-900">{fmtDate(record.compiledAt)}</td>
                          <td className="px-6 py-2 text-[14px] text-gray-900">{getDeptName(record.departmentId)}</td>
                          <td className="px-6 py-2 text-[14px] text-gray-900">{getLecturerName(record.lecturerId)}</td>
                          <td className="px-6 py-2">
                            <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[12px] font-medium border border-gray-200">
                              {gradeLabel(getLecturer(record.lecturerId)?.grade)}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-[14px] text-gray-900 font-mono">
                            {record.tarifficationStatus === "TARIFFIED" && cS1 > 0 ? fmtCost(cS1) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-2 text-[14px] text-gray-900 font-mono">
                            {record.tarifficationStatus === "TARIFFIED" && cS2 > 0 ? fmtCost(cS2) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-2 text-[14px] font-semibold text-gray-900">{fmtMin(record.combinedTotal)}</td>
                          <td className="px-6 py-2">
                            <button
                              onClick={e => { e.stopPropagation(); void handleExportPDF(record); }}
                              disabled={exporting}
                              className="flex items-center justify-center w-28 px-3 py-1.5 text-[12px] font-medium border bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <Download size={13} className="mr-1" /> Export
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200 text-[12px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Rows per page:</label>
                    <select
                      value={rowsPerPage}
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="border border-gray-300 px-2 py-1 text-sm bg-white"
                    >
                      {[5,8,10,20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <p className="font-semibold text-gray-800 text-[13px]">
                    Total: <span className="font-bold text-gray-900">{filtered.length}</span>
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={validPage === 1}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 text-[13px]">‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 flex items-center justify-center border text-[12px] font-medium ${p === validPage ? "bg-gray-700 text-white border-gray-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={validPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 text-[13px]">›</button>
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

export default DeanDashboard;