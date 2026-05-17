"use client";

import { LoaderCircle, Pencil, Save, Trash2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import ConfigurationAPI, {
  type ConfigurationPayload,
  type PayrollRowPayload,
} from "@/services/configurationAPI";

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT CONFIG
═══════════════════════════════════════════════════════════════════════════ */

const defaultConfiguration: ConfigurationPayload = {
  republicName: "REPUBLIC OF CAMEROON",
  universityName: "University of Yaounde I",
  facultyName: "Faculty of Sciences",
  departmentName: "Department of Computer Science",
  documentTitle: "Teaching Load Approval Record",
  academicYear: "2025 / 2026",
  referencePrefix: "FS/CS",
  referenceLabel: "Ref. No:",
  dateLabel: "Date:",
  lecturerLabel: "Lecturer Name",
  departmentLabel: "Department",
  gradeLabel: "Grade / Rank",
  groupsLabel: "Groups",
  referenceNumberLabel: "Reference No.",
  numberOfCoursesLabel: "No. of Courses",
  sectionIdentificationTitle: "I. Identification",
  sectionHoursDetailTitle: "II. Teaching Hours Detail",
  typeLabel: "Type",
  semesterOneLabel: "Semester 1",
  semesterTwoLabel: "Semester 2",
  totalVolumeLabel: "Total Volume",
  extraHoursLabel: "Extra Hours",
  appliedRateLabel: "Applied Rate",
  totalsLabel: "Totals",
  combinedTotalLabel: "Combined Total",
  sectionFinancialTitle: "III. Financial Estimate",
  financialSummaryTitle: "Financial Summary",
  estimatedCostLabel: "Estimated Cost S1 / S2",
  semesterOneCmHours: 28,
  semesterOneTdHours: 21,
  semesterOneTpHours: 11,
  semesterTwoCmHours: 24,
  semesterTwoTdHours: 24,
  semesterTwoTpHours: 11,
  cmRate: 1000,
  tdRate: 1000,
  tpRate: 1000,
};

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const Field = ({
  label,
  value,
  editing,
  onChange,
  monospace = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  monospace?: boolean;
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</span>
    {editing ? (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`px-3 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-gray-500 ${monospace ? "font-mono" : ""}`}
      />
    ) : (
      <p className={`text-[13px] text-gray-800 py-2 border-b border-gray-200 ${monospace ? "font-mono" : ""}`}>
        {value || <span className="text-gray-400 italic">—</span>}
      </p>
    )}
  </div>
);

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 pt-2">
    <div className="w-1 h-5 bg-gray-800" />
    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{label}</span>
    <div className="flex-1 border-t border-gray-200" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

const Configuration = () => {
  const [config,         setConfig]         = useState<ConfigurationPayload>(defaultConfiguration);
  const [draft,          setDraft]          = useState<ConfigurationPayload>(defaultConfiguration);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);
  const [payrollRows,    setPayrollRows]     = useState<PayrollRowPayload[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [newPayroll,     setNewPayroll]     = useState<PayrollRowPayload>({ title: "", semester: "", hours: 0, rate: 0 });
  const [error,          setError]          = useState<string | null>(null);
  const [success,        setSuccess]        = useState<string | null>(null);

  /* ── load config ── */
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await ConfigurationAPI.get();
        if (!active) return;
        const normalized = { ...defaultConfiguration, ...payload };
        setConfig(normalized);
        setDraft(normalized);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load configuration.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  /* ── load payroll rows ── */
  useEffect(() => {
    let active = true;
    (async () => {
      setPayrollLoading(true);
      try {
        const rows = await ConfigurationAPI.getPayrollRows();
        if (!active) return;
        setPayrollRows(rows);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load payroll table.");
      } finally {
        if (active) setPayrollLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const setText = (key: keyof ConfigurationPayload, v: string) =>
    setDraft((p) => ({ ...p, [key]: v }));

  const handleCancel = () => { setDraft(config); setIsEditing(false); setError(null); };

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const payload = await ConfigurationAPI.update(draft);
      setConfig(payload); setDraft(payload); setIsEditing(false);
      setSuccess("Configuration saved successfully.");
      window.setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const updatePayrollField = (id: number | undefined, key: keyof PayrollRowPayload, value: string) => {
    if (!id) return;
    setPayrollRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [key]: key === "hours" || key === "rate" ? Number(value) || 0 : value }
          : row,
      ),
    );
  };

  const savePayrollRow = async (row: PayrollRowPayload) => {
    if (!row.id) return;
    try {
      const updated = await ConfigurationAPI.updatePayrollRow(row.id, row);
      setPayrollRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setSuccess("Row saved."); window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save row.");
    }
  };

  const addPayrollRow = async () => {
    if (!newPayroll.title.trim() || !newPayroll.semester.trim()) {
      setError("Payroll title and semester are required before adding a row.");
      return;
    }
    try {
      const created = await ConfigurationAPI.createPayrollRow(newPayroll);
      setPayrollRows((prev) => [...prev, created]);
      setNewPayroll({ title: "", semester: "", hours: 0, rate: 0 });
      setSuccess("Row added."); window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add row.");
    }
  };

  const deletePayrollRow = async (id?: number) => {
    if (!id) return;
    try {
      await ConfigurationAPI.deletePayrollRow(id);
      setPayrollRows((prev) => prev.filter((r) => r.id !== id));
      setSuccess("Row deleted."); window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete row.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-500">
        <LoaderCircle className="w-5 h-5 animate-spin" />
        <span className="text-[14px]">Loading configuration…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">CONFIGURATION</h1>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-[13px] font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {error   && <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{error}</div>}
      {success && <div className="px-3 py-2 bg-green-50 border border-green-300 text-[13px] text-green-700">{success}</div>}

      {/* ── Form body ── */}
      <div className="bg-white border border-gray-300">

        {/* LETTERHEAD */}
        <div className="px-8 pt-6 pb-5 border-b border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Letterhead</p>
          <div className="space-y-3">
            <Field label="Republic / Country Name" value={draft.republicName}   editing={isEditing} onChange={(v) => setText("republicName", v)} />
            <Field label="University Name"          value={draft.universityName} editing={isEditing} onChange={(v) => setText("universityName", v)} />
            <Field label="Faculty Name"             value={draft.facultyName}    editing={isEditing} onChange={(v) => setText("facultyName", v)} />
          </div>
        </div>

        {/* DOCUMENT TITLE BLOCK */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Document Title Block</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Field label="Document Title" value={draft.documentTitle} editing={isEditing} onChange={(v) => setText("documentTitle", v)} />
            <Field label="Academic Year"  value={draft.academicYear}  editing={isEditing} onChange={(v) => setText("academicYear", v)} monospace />
          </div>
        </div>

        {/* REF / DATE BAR */}
        <div className="px-8 py-5 border-b border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Reference &amp; Date Bar</p>
          <div className="grid grid-cols-3 gap-x-8 gap-y-3">
            <Field label="Reference Bar Label" value={draft.referenceLabel}  editing={isEditing} onChange={(v) => setText("referenceLabel", v)} />
            <Field label="Reference Prefix"    value={draft.referencePrefix} editing={isEditing} onChange={(v) => setText("referencePrefix", v)} monospace />
            <Field label="Date Bar Label"      value={draft.dateLabel}       editing={isEditing} onChange={(v) => setText("dateLabel", v)} />
          </div>
        </div>

        {/* I. IDENTIFICATION */}
        <div className="px-8 py-5 border-b border-gray-200">
          <div className="mb-4">
            <SectionDivider label="I. Identification" />
            <div className="mt-3">
              <Field
                label="Section Title"
                value={draft.sectionIdentificationTitle}
                editing={isEditing}
                onChange={(v) => setText("sectionIdentificationTitle", v)}
              />
            </div>
          </div>

          <div className="border border-gray-300 divide-y divide-gray-200 mt-4">
            {(
              [
                ["lecturerLabel",       draft.lecturerLabel,       "Lecturer name (dynamic)"],
                ["departmentLabel",     draft.departmentLabel,     "Department name (dynamic)"],
                ["gradeLabel",          draft.gradeLabel,          "Lecturer grade (dynamic)"],
                ["groupsLabel",         draft.groupsLabel,         "—"],
                ["referenceNumberLabel",draft.referenceNumberLabel,"Tariff rate / hr (dynamic)"],
              ] as [keyof ConfigurationPayload, string, string][]
            ).map(([key, val, placeholder]) => (
              <div key={key} className="grid grid-cols-[180px_1fr] divide-x divide-gray-200">
                <div className="px-4 py-2 bg-gray-50">
                  {isEditing ? (
                    <input
                      value={val}
                      onChange={(e) => setText(key, e.target.value)}
                      className="w-full text-[12px] font-semibold text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-[12px] font-semibold text-gray-700">{val}</span>
                  )}
                </div>
                <div className="px-4 py-2 bg-white">
                  <span className="text-[12px] text-gray-400 italic">{placeholder}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* II. TEACHING HOURS DETAIL */}
        <div className="px-8 py-5 border-b border-gray-200">
          <div className="mb-4">
            <SectionDivider label="II. Teaching Hours Detail" />
            <div className="mt-3">
              <Field
                label="Section Title"
                value={draft.sectionHoursDetailTitle}
                editing={isEditing}
                onChange={(v) => setText("sectionHoursDetailTitle", v)}
              />
            </div>
          </div>

          <table className="w-full border-collapse text-[12px] mt-4">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-800 text-white px-3 py-2 text-left w-40">
                  {isEditing ? (
                    <input
                      value={draft.typeLabel}
                      onChange={(e) => setText("typeLabel", e.target.value)}
                      className="w-full bg-transparent text-white placeholder-gray-400 border-b border-gray-500 focus:outline-none text-[12px] font-semibold"
                    />
                  ) : (
                    <span className="font-semibold uppercase tracking-wider text-[11px]">{draft.typeLabel}</span>
                  )}
                </th>
                {(["semesterOneLabel", "semesterTwoLabel"] as const).map((k) => (
                  <th key={k} className="border border-gray-300 bg-gray-700 text-white px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        value={draft[k]}
                        onChange={(e) => setText(k, e.target.value)}
                        className="w-full bg-transparent text-white text-center border-b border-gray-500 focus:outline-none text-[12px] font-semibold"
                      />
                    ) : (
                      <span className="font-semibold uppercase tracking-wider text-[11px]">{draft[k]}</span>
                    )}
                  </th>
                ))}
                <th className="border border-gray-300 bg-gray-600 text-white px-3 py-2 text-center">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-gray-300">Combined Total</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Total Volume */}
              <tr>
                <td className="border border-gray-200 px-3 py-2.5 bg-gray-50">
                  {isEditing ? (
                    <input
                      value={draft.totalVolumeLabel ?? "Total Volume"}
                      onChange={(e) => setText("totalVolumeLabel" as keyof ConfigurationPayload, e.target.value)}
                      className="w-full text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{draft.totalVolumeLabel ?? "Total Volume"}</span>
                  )}
                </td>
                <td className="border border-gray-200 px-3 py-2.5 text-center text-gray-400 text-[12px] italic">dynamic</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center text-gray-400 text-[12px] italic">dynamic</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center text-gray-400 text-[12px] italic">dynamic</td>
              </tr>

              {/* Extra Hours */}
              <tr>
                <td className="border border-gray-200 px-3 py-2.5 bg-gray-50">
                  {isEditing ? (
                    <input
                      value={draft.extraHoursLabel}
                      onChange={(e) => setText("extraHoursLabel", e.target.value)}
                      className="w-full text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{draft.extraHoursLabel}</span>
                  )}
                </td>
                <td className="border border-gray-200 px-3 py-2.5 text-center text-emerald-600 font-bold text-[13px]">+6h 15min</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center text-emerald-600 font-bold text-[13px]">+4h 55min</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center text-emerald-600 font-bold text-[14px]">+11h 10min</td>
              </tr>

              {/* Applied Rate */}
              <tr>
                <td className="border border-gray-200 px-3 py-2.5 bg-gray-50">
                  {isEditing ? (
                    <input
                      value={draft.appliedRateLabel ?? "Applied Rate"}
                      onChange={(e) => setText("appliedRateLabel" as keyof ConfigurationPayload, e.target.value)}
                      className="w-full text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{draft.appliedRateLabel ?? "Applied Rate"}</span>
                  )}
                </td>
                <td colSpan={3} className="border border-gray-200 px-3 py-2.5 text-center text-gray-400 text-[12px] italic font-mono">
                  100 FCFA / hr — grade: P &nbsp;(dynamic)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* III. FINANCIAL ESTIMATE */}
        <div className="px-8 py-5 border-b border-gray-200">
          <div className="mb-4">
            <SectionDivider label="III. Financial Estimate" />
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3">
              <Field
                label="Section Divider Title"
                value={draft.sectionFinancialTitle}
                editing={isEditing}
                onChange={(v) => setText("sectionFinancialTitle", v)}
              />
              <Field
                label="Financial Summary Block Title"
                value={draft.financialSummaryTitle}
                editing={isEditing}
                onChange={(v) => setText("financialSummaryTitle", v)}
              />
            </div>
          </div>

          <div className="border border-gray-300 mt-4">
            <div className="px-4 py-2.5 bg-gray-800">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                {draft.financialSummaryTitle}
              </span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-200 border-t border-gray-200">
              <div className="px-4 py-2.5 bg-gray-50 text-[12px] font-semibold text-gray-700">{draft.semesterOneLabel} Extra Hours</div>
              <div className="px-4 py-2.5 text-[12px] text-gray-400 italic text-right">dynamic</div>
              <div className="px-4 py-2.5 bg-gray-50 text-[12px] font-semibold text-gray-700">{draft.semesterTwoLabel} Extra Hours</div>
              <div className="px-4 py-2.5 text-[12px] text-gray-400 italic text-right">dynamic</div>
            </div>
            <div className="border-t border-gray-200 bg-blue-50">
              <div className="grid grid-cols-4 divide-x divide-gray-200">
                <div className="px-4 py-2.5 col-span-1">
                  {isEditing ? (
                    <input
                      value={draft.estimatedCostLabel}
                      onChange={(e) => setText("estimatedCostLabel", e.target.value)}
                      className="w-full text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-transparent border-b border-blue-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">{draft.estimatedCostLabel}</span>
                  )}
                </div>
                <div className="px-4 py-2.5 text-center text-blue-800 font-bold font-mono text-[13px]">625 FCFA</div>
                <div className="px-4 py-2.5 text-center text-blue-800 font-bold font-mono text-[13px]">492 FCFA</div>
                <div className="px-4 py-2.5 text-center text-blue-900 font-bold font-mono text-[14px]">1,117 FCFA</div>
              </div>
            </div>
          </div>
        </div>

        {/* PAYROLL TABLE */}
        <div className="px-8 py-5">
          <div className="mb-4">
            <SectionDivider label="Payroll Table Rows" />
            <p className="text-[12px] text-gray-400 mt-2 ml-4">
              These rows are stored in the database and used to compute per-course financial breakdowns.
            </p>
          </div>

          {payrollLoading ? (
            <div className="flex items-center gap-2 py-6 text-gray-500 text-[13px]">
              <LoaderCircle size={15} className="animate-spin" /> Loading rows…
            </div>
          ) : (
            <div className="border border-gray-300">
              <table className="w-full border-collapse text-[13px]">
                <thead className="bg-gray-700">
                  <tr>
                    {["Title", "Semester", "Hours", "Rate (FCFA/hr)", ""].map((h, i) => (
                      <th
                        key={h || i}
                        className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-white border-r border-gray-600 last:border-r-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {payrollRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-200 last:border-b-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          value={row.title}
                          onChange={(e) => updatePayrollField(row.id, "title", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 text-[13px] focus:outline-none focus:border-gray-400"
                          placeholder="CM / TD / TP"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.semester}
                          onChange={(e) => updatePayrollField(row.id, "semester", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 text-[13px] focus:outline-none focus:border-gray-400"
                          placeholder="S1 / S2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.hours}
                          onChange={(e) => updatePayrollField(row.id, "hours", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 text-[13px] font-mono focus:outline-none focus:border-gray-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={(e) => updatePayrollField(row.id, "rate", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 text-[13px] font-mono focus:outline-none focus:border-gray-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void savePayrollRow(row)}
                            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                          >
                            <Save size={11} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => void deletePayrollRow(row.id)}
                            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Add row */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        value={newPayroll.title}
                        onChange={(e) => setNewPayroll((p) => ({ ...p, title: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 text-[13px] focus:outline-none focus:border-gray-500"
                        placeholder="CM / TD / TP"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newPayroll.semester}
                        onChange={(e) => setNewPayroll((p) => ({ ...p, semester: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 text-[13px] focus:outline-none focus:border-gray-500"
                        placeholder="Semester 1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={newPayroll.hours}
                        onChange={(e) => setNewPayroll((p) => ({ ...p, hours: Number(e.target.value) || 0 }))}
                        className="w-full px-2 py-1 border border-gray-300 text-[13px] font-mono focus:outline-none focus:border-gray-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={newPayroll.rate}
                        onChange={(e) => setNewPayroll((p) => ({ ...p, rate: Number(e.target.value) || 0 }))}
                        className="w-full px-2 py-1 border border-gray-300 text-[13px] font-mono focus:outline-none focus:border-gray-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void addPayrollRow()}
                        className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors"
                      >
                        <Plus size={11} /> Add row
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Configuration;