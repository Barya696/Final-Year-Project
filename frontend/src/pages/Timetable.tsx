"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ApiTimetableEntry,
  createTimetable,
  deleteTimetable,
  dayDisplayFromApi,
  dayToApi,
  fetchTimetables,
  normalizeTimeForInput,
  updateTimetable,
  type TimetableRequestPayload,
} from "@/services/timetableApi";

/* ─────────────────────────────── types ─────────────────────────────── */
interface CourseOption {
  id: number;
  courseName: string;
  code: string;
}

interface RoomOption {
  id: number;
  roomName: string;
}

interface TimetableRow {
  id: string;
  serverId?: number;
  semester: string;
  courseId: number;
  roomId: number;
  lecturerId: number | "";
  groupCode: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

/* ─────────────────────────────── constants ───────────────────────────── */
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const OPTIMIZE_PRESET_PROMPT =
  "Spread classes evenly across Mon–Fri, prefer mornings 08:00–13:00, eliminate all conflicts";

const FILE_ONLY_PROMPT = "Apply changes based on the uploaded file.";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Text-only optimizations (matches product spec); vision uploads use Groq-supported vision ID. */
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function getGroqApiKey(): string | undefined {
  return import.meta.env.VITE_GROQ_API_KEY as string | undefined;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fromMin(m: number) {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

function inferSemester(existing: TimetableRow[]): string {
  const s = existing.find((r) => r.semester.trim())?.semester.trim();
  return s ?? "General";
}

function mapApiToRow(t: ApiTimetableEntry): TimetableRow {
  const c = t.course;
  const r = t.room;
  const lec = t.lecturer;
  return {
    id: `s-${t.id}`,
    serverId: t.id,
    semester: t.semester ?? "",
    courseId: c?.id ?? 0,
    roomId: r?.id ?? 0,
    lecturerId: lec?.id ?? "",
    groupCode: t.groupCode ?? "",
    courseCode: c?.code ?? "",
    courseName: c?.courseName ?? "",
    instructor: lec?.lecturerName ?? "",
    day: dayDisplayFromApi(t.dayOfWeek),
    startTime: normalizeTimeForInput(t.startTime),
    endTime: normalizeTimeForInput(t.endTime),
    room: r?.roomName ?? "",
  };
}

function toRequestPayload(row: TimetableRow): TimetableRequestPayload {
  return {
    semester: row.semester.trim(),
    dayOfWeek: dayToApi(row.day),
    courseId: row.courseId,
    roomId: row.roomId,
    lecturerId: row.lecturerId === "" ? null : row.lecturerId,
    startTime: row.startTime,
    endTime: row.endTime,
    groupCode: row.groupCode.trim() ? row.groupCode.trim() : null,
  };
}

function hasConflict(
  slots: Pick<TimetableRow, "id" | "day" | "room" | "startTime" | "endTime">[],
  candidate: Pick<TimetableRow, "id" | "day" | "room" | "startTime" | "endTime">
): Pick<TimetableRow, "id" | "day" | "room" | "startTime" | "endTime"> | null {
  for (const slot of slots) {
    if (candidate.id && slot.id === candidate.id) continue;
    if (slot.day !== candidate.day) continue;
    if (slot.room !== candidate.room) continue;
    if (candidate.startTime < slot.endTime && candidate.endTime > slot.startTime) return slot;
  }
  return null;
}

/* ─────────────────────────────── AI optimizer helpers ─────────────────── */

function buildSystemPrompt(courseList: CourseOption[], roomList: RoomOption[]): string {
  const contextHint = `
Available courses: ${courseList.map((c) => `${c.code} (${c.courseName})`).join(", ")}.
Available rooms: ${roomList.map((r) => r.roomName).join(", ")}.
`.trim();

  return `
You are a timetable optimizer for a university scheduling system.
${contextHint}

Rules you MUST follow:
- Never schedule two classes in the same room at overlapping times
  (conflict = same room + same day + overlapping startTime–endTime)
- Keep courseId, roomId, lecturerId, semester, groupCode UNCHANGED
  unless the user explicitly asks to change them
- Only modify: day, startTime, endTime
  (room/roomId only if needed to resolve a conflict)
- Time format: HH:MM (24-hour). Days: Monday–Saturday
- Return ONLY a raw JSON array — no markdown, no explanation, no extra keys
`.trim();
}

function serializeTimetableForAi(rows: TimetableRow[]): unknown[] {
  return rows.map((r) => ({
    id: r.id,
    day: r.day,
    startTime: r.startTime,
    endTime: r.endTime,
    room: r.room,
    roomId: r.roomId,
    courseId: r.courseId,
    courseName: r.courseName,
    courseCode: r.courseCode,
    lecturerId: r.lecturerId === "" ? null : r.lecturerId,
    semester: r.semester,
    groupCode: r.groupCode,
    instructor: r.instructor,
  }));
}

async function readSpreadsheetOrPlainFileAsString(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".csv")) {
    return file.text();
  }
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`## Sheet: ${sheetName}\n${csv}`);
    }
    return parts.join("\n\n");
  }
  throw new Error("Expected .txt, .csv, .xls, or .xlsx for text extraction.");
}

function isVisionMimeFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

type AiGroqParsedRow = Partial<TimetableRow> & { id?: string };

function mergeAiOntoRows(currentRows: TimetableRow[], parsed: unknown): TimetableRow[] {
  if (!Array.isArray(parsed)) throw new Error("AI response must be a JSON array.");

  const list = parsed as AiGroqParsedRow[];

  return currentRows.map((orig) => {
    const ai = list.find((p) => p.id === orig.id);
    if (!ai) return orig;

    return {
      ...orig,
      day:
        typeof ai.day === "string" && days.includes(ai.day)
          ? ai.day
          : orig.day,
      startTime:
        typeof ai.startTime === "string" ? ai.startTime : orig.startTime,
      endTime: typeof ai.endTime === "string" ? ai.endTime : orig.endTime,
      room: typeof ai.room === "string" ? ai.room : orig.room,
      roomId: typeof ai.roomId === "number" ? ai.roomId : orig.roomId,
    };
  });
}

async function callGroqOptimize(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string | GroqChatContentPart[];
}): Promise<string> {
  const { apiKey, model, systemPrompt, userContent } = params;

  const userMessage =
    typeof userContent === "string"
      ? { role: "user" as const, content: userContent }
      : { role: "user" as const, content: userContent };

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [{ role: "system", content: systemPrompt }, userMessage],
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const msg =
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof (data.error as { message?: unknown }).message === "string"
        ? (data.error as { message: string }).message
        : response.statusText || "Groq request failed";
    throw new Error(msg);
  }

  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  const raw = choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Empty response from AI.");

  return raw.replace(/```json|```/g, "").trim();
}

/** OpenAI-compatible chat content fragment for multimodal user messages */
type GroqChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function prepareUserPayloadForGroq(opts: {
  userPrompt: string;
  timetableJson: string;
  attached: File | null;
}): Promise<{ userContent: string | GroqChatContentPart[]; model: string }> {
  const { userPrompt, timetableJson, attached } = opts;

  if (!attached) {
    const text = `${userPrompt}\n\nCurrent timetable JSON:\n${timetableJson}`;
    return { userContent: text, model: GROQ_TEXT_MODEL };
  }

  if (isVisionMimeFile(attached)) {
    const dataUrl = await readFileAsDataURL(attached);
    const text = `${userPrompt}\n\nCurrent timetable JSON:\n${timetableJson}`;
    return {
      model: GROQ_VISION_MODEL,
      userContent: [
        { type: "image_url", image_url: { url: dataUrl } },
        { type: "text", text },
      ],
    };
  }

  const filePayload = await readSpreadsheetOrPlainFileAsString(attached);
  const text = `${userPrompt}\n\nUploaded file content:\n${filePayload}\n\nCurrent timetable JSON:\n${timetableJson}`;
  return { userContent: text, model: GROQ_TEXT_MODEL };
}

/* ─────────────────────────────── Export helpers ─────────────────────── */

/** Builds the time slots array the same way WeeklyView does. */
function buildTimeSlots(rows: TimetableRow[]): string[] {
  const allStarts = rows.map((r) => toMin(r.startTime));
  const minHour = rows.length ? Math.floor(Math.min(...allStarts) / 60) : 8;
  const maxHour = 18;
  const slots: string[] = [];
  for (let h = minHour; h < maxHour; h++) slots.push(fromMin(h * 60));
  return slots;
}

function getSlotsInHour(rows: TimetableRow[], day: string, hour: string): TimetableRow[] {
  const hMin = toMin(hour);
  const hMax = hMin + 60;
  return rows.filter(
    (r) =>
      r.day === day &&
      toMin(r.startTime) < hMax &&
      toMin(r.endTime) > hMin &&
      toMin(r.startTime) >= hMin
  );
}

async function exportPDF(data: TimetableRow[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const activeDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeSlots = buildTimeSlots(data);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Class Timetable", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Exported ${new Date().toLocaleDateString()}`, 14, 21);
  doc.setTextColor(0);

  const head = [["Time", ...activeDays]];

  const body = timeSlots.map((hour) => {
    const nextHour = fromMin(toMin(hour) + 60);
    const timeLabel = `${hour} – ${nextHour}`;

    const cells = activeDays.map((day) => {
      const cellSlots = getSlotsInHour(data, day, hour);
      if (cellSlots.length === 0) return "";
      return cellSlots
        .map((s) => `${s.courseName}\n${s.room ? `[${s.room}]` : ""}`.trim())
        .join("\n\n");
    });

    return [timeLabel, ...cells];
  });

  autoTable(doc, {
    startY: 28,
    head,
    body,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: "top",
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [42, 42, 40],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 244, 242] },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold", halign: "center", fillColor: [230, 230, 228] },
      1: { cellWidth: "auto" },
      2: { cellWidth: "auto" },
      3: { cellWidth: "auto" },
      4: { cellWidth: "auto" },
      5: { cellWidth: "auto" },
      6: { cellWidth: "auto" },
    },
    tableLineColor: [150, 150, 150],
    tableLineWidth: 0.4,
    margin: { left: 10, right: 10 },
  });

  doc.save("timetable.pdf");
}

async function exportXLS(data: TimetableRow[]) {
  const XLSX = await import("xlsx");
  const activeDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeSlots = buildTimeSlots(data);

  const headerRow = ["Time", ...activeDays];

  const bodyRows = timeSlots.map((hour) => {
    const nextHour = fromMin(toMin(hour) + 60);
    const timeLabel = `${hour} – ${nextHour}`;
    const cells = activeDays.map((day) => {
      const cellSlots = getSlotsInHour(data, day, hour);
      if (cellSlots.length === 0) return "";
      return cellSlots
        .map((s) => `${s.courseName}${s.room ? ` [${s.room}]` : ""}`)
        .join(" | ");
    });
    return [timeLabel, ...cells];
  });

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);

  ws["!cols"] = [
    { wch: 18 },
    ...activeDays.map(() => ({ wch: 28 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Weekly Timetable");
  XLSX.writeFile(wb, "timetable.xlsx");
}

/* ─────────────────────────────── WeeklyView ─────────────────────────── */
function WeeklyView({ rows }: { rows: TimetableRow[] }) {
  const activeDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeSlots = buildTimeSlots(rows);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach((r) => {
      if (hasConflict(rows, r)) ids.add(r.id);
    });
    return ids;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-300 px-6 py-16 text-center text-[14px] text-gray-400">
        No classes scheduled yet. Add some in the &ldquo;Manage&rdquo; tab.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 700 }}>
        <thead className="bg-gray-700 sticky top-0">
          <tr>
            <th className="border border-gray-600 px-3 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap w-28">
              TIME
            </th>
            {activeDays.map((day) => (
              <th
                key={day}
                className="border border-gray-600 px-3 py-2 text-center text-[13px] font-semibold text-white"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((hour, hi) => {
            const nextHour = fromMin(toMin(hour) + 60);
            return (
              <tr key={hour} className={hi % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-200 px-3 py-2 text-[11px] font-mono text-gray-500 whitespace-nowrap align-top w-28">
                  {hour} – {nextHour}
                </td>
                {activeDays.map((day) => {
                  const cellSlots = getSlotsInHour(rows, day, hour);
                  return (
                    <td
                      key={day}
                      className="border border-gray-200 px-2 py-1.5 align-top"
                      style={{ minHeight: 48 }}
                    >
                      {cellSlots.map((slot) => {
                        const isConflict = conflictIds.has(slot.id);
                        return (
                          <div key={slot.id} className="py-0.5">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[12px] font-semibold ${isConflict ? "text-red-600" : "text-gray-900"}`}
                              >
                                {slot.courseName}
                              </span>
                              {isConflict && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-gray-500">{slot.room}</div>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────── Main ───────────────────────────────── */
export default function Timetable() {
  const { apiFetch } = useAuth();

  const [tab, setTab] = useState<"manage" | "weekly">("manage");
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [saved, setSaved] = useState(false);
  const [conflictId, setConflictId] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [persistError, setPersistError] = useState("");
  const [saving, setSaving] = useState(false);

  const [filterDay, setFilterDay] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const aiResetTimers = useRef<{
    done?: ReturnType<typeof setTimeout>;
    err?: ReturnType<typeof setTimeout>;
  }>({});
  const [aiDraft, setAiDraft] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAppliedFlash, setAiAppliedFlash] = useState(false);
  const [aiErrorBanner, setAiErrorBanner] = useState("");

  const roomNamesSorted = useMemo(() => [...new Set(rooms.map((r) => r.roomName))].sort(), [rooms]);

  const reloadTimetables = useCallback(async () => {
    setLoadingList(true);
    setPersistError("");
    try {
      const list = await fetchTimetables(apiFetch, undefined);
      setRows(list.map(mapApiToRow));
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : "Failed to load timetables");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    async function loadRefs() {
      try {
        const [cRes, rRes] = await Promise.all([
          apiFetch("http://localhost:8080/api/courses"),
          apiFetch("http://localhost:8080/api/rooms"),
        ]);
        if (!cRes.ok || !rRes.ok) throw new Error("Failed to load courses or rooms");
        const cRaw = (await cRes.json()) as CourseOption[];
        const rRaw = (await rRes.json()) as RoomOption[];
        if (!cancelled) {
          setCourses(cRaw);
          setRooms(rRaw);
          setRefsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setRefsLoaded(false);
          setPersistError((p) => p || "Could not load courses or rooms.");
        }
      }
    }
    loadRefs();
    return () => { cancelled = true; };
  }, [apiFetch]);

  useEffect(() => {
    reloadTimetables();
  }, [reloadTimetables]);

  useEffect(() => {
    const t = aiResetTimers.current;
    return () => {
      if (t.done) clearTimeout(t.done);
      if (t.err) clearTimeout(t.err);
    };
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterDay && r.day !== filterDay) return false;
      if (filterRoom && r.room !== filterRoom) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (
          !r.courseCode.toLowerCase().includes(q) &&
          !r.courseName.toLowerCase().includes(q) &&
          !r.instructor.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, filterDay, filterRoom, filterSearch]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach((r) => {
      if (hasConflict(rows, r)) ids.add(r.id);
    });
    return ids;
  }, [rows]);

  const hasActiveFilter = filterDay || filterRoom || filterSearch;

  function clearFilters() {
    setFilterDay("");
    setFilterRoom("");
    setFilterSearch("");
  }

  function addRow() {
    const c0 = courses[0];
    const r0 = rooms[0];
    setRows((prev) => [
      ...prev,
      {
        id: generateId(),
        semester: inferSemester(prev),
        courseId: c0?.id ?? 0,
        roomId: r0?.id ?? 0,
        lecturerId: "",
        groupCode: "",
        courseCode: c0?.code ?? "",
        courseName: c0?.courseName ?? "",
        instructor: "",
        day: "Monday",
        startTime: "08:00",
        endTime: "09:00",
        room: r0?.roomName ?? "",
      },
    ]);
    setConflictId(null);
  }

  async function removeRow(id: string) {
    const row = rows.find((r) => r.id === id);
    try {
      if (row?.serverId != null) await deleteTimetable(apiFetch, row.serverId);
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : "Delete failed");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (conflictId === id) setConflictId(null);
    setPersistError("");
  }

  function updateRow(id: string, field: keyof TimetableRow, value: string | number | "") {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value } as TimetableRow;
        if (field === "courseCode") {
          const found = courses.find((c) => c.code === value);
          updated.courseName = found?.courseName ?? "";
          updated.courseId = found?.id ?? 0;
        }
        if (field === "room") {
          const foundRm = rooms.find((x) => x.roomName === value);
          updated.roomId = foundRm?.id ?? 0;
        }
        if (field === "startTime" && typeof value === "string" && value >= updated.endTime) {
          const [h, m] = value.split(":").map(Number);
          updated.endTime = fromMin(h * 60 + m + 60);
        }
        return updated;
      })
    );
    setConflictId(null);
  }

  const canAiSend =
    !!(aiDraft.trim() || aiFile) && refsLoaded && !aiBusy && courses.length > 0 && rooms.length > 0;

  async function runAiOptimizer(flow: "optimize" | "send") {
    const apiKey = getGroqApiKey()?.trim();
    if (!apiKey) {
      setAiErrorBanner(
        "Set VITE_GROQ_API_KEY in frontend/.env.local. Prefer routing requests through your backend — never expose production keys to browsers."
      );
      if (aiResetTimers.current.err) clearTimeout(aiResetTimers.current.err);
      aiResetTimers.current.err = setTimeout(() => setAiErrorBanner(""), 4000);
      return;
    }

    let userPrompt: string;
    let attached: File | null;

    if (flow === "optimize") {
      userPrompt = OPTIMIZE_PRESET_PROMPT;
      attached = null;
    } else {
      const trimmed = aiDraft.trim();
      if (!trimmed && !aiFile) return;
      userPrompt = trimmed || FILE_ONLY_PROMPT;
      attached = aiFile;
    }

    if (rows.length === 0) {
      setAiErrorBanner("Nothing to optimize — add classes first.");
      if (aiResetTimers.current.err) clearTimeout(aiResetTimers.current.err);
      aiResetTimers.current.err = setTimeout(() => setAiErrorBanner(""), 4000);
      return;
    }

    setAiBusy(true);
    setAiErrorBanner("");
    setAiAppliedFlash(false);
    try {
      const timetableJson = JSON.stringify(serializeTimetableForAi(rows));
      const systemPrompt = buildSystemPrompt(courses, rooms);
      const { userContent, model } = await prepareUserPayloadForGroq({
        userPrompt,
        timetableJson,
        attached,
      });
      const raw = await callGroqOptimize({
        apiKey,
        model,
        systemPrompt,
        userContent,
      });
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("AI response was not valid JSON.");
      }

      const next = mergeAiOntoRows(rows, parsed);
      setRows(next);
      setConflictId(null);

      setAiAppliedFlash(true);
      if (aiResetTimers.current.done) clearTimeout(aiResetTimers.current.done);
      aiResetTimers.current.done = setTimeout(() => setAiAppliedFlash(false), 2500);
    } catch (e) {
      setAiErrorBanner(e instanceof Error ? e.message : "AI optimization failed.");
      if (aiResetTimers.current.err) clearTimeout(aiResetTimers.current.err);
      aiResetTimers.current.err = setTimeout(() => setAiErrorBanner(""), 4000);
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSave() {
    for (const row of rows) {
      const conflict = hasConflict(rows, row);
      if (conflict) {
        setConflictId(row.id);
        return;
      }
    }

    for (const row of rows) {
      const p = toRequestPayload(row);
      if (!p.semester) {
        setPersistError("Semester is required per row.");
        setConflictId(row.id);
        return;
      }
      if (!p.courseId || !p.roomId) {
        setPersistError("Course and room must be resolved.");
        setConflictId(row.id);
        return;
      }
    }

    setSaving(true);
    setPersistError("");
    try {
      for (const row of rows) {
        const body = toRequestPayload(row);
        if (row.serverId == null) await createTimetable(apiFetch, body);
        else await updateTimetable(apiFetch, row.serverId, body);
      }
      await reloadTimetables();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : "Save failed");
      await reloadTimetables();
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "px-3 py-1.5 border border-gray-300 text-[13px] text-gray-900 bg-white hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400";

  return (
    <div className="space-y-4">
      {persistError ? (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{persistError}</div>
      ) : null}

      {/* ── Top Bar: Tabs + Export buttons ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(["manage", "weekly"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-[12px] font-semibold border transition-colors ${
                tab === t
                  ? "bg-gray-300 text-gray-900 border-gray-400"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {t === "manage" ? "MANAGE" : "WEEKLY VIEW"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportPDF(filteredRows)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border border-red-300 text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportXLS(filteredRows)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border border-green-400 text-green-800 bg-white hover:bg-green-50 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export XLS
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 border border-gray-300">
        <span className="text-[12px] font-semibold text-gray-600">Filter:</span>

        <input
          type="text"
          placeholder="Search course or instructor…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 text-[12px] text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 w-52"
        />

        <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className={selectClass}>
          <option value="">All days</option>
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

        <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} className={selectClass}>
          <option value="">All rooms</option>
          {roomNamesSorted.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        <span className="ml-auto text-[12px] text-gray-500">
          {filteredRows.length} of {rows.length} classes
          {loadingList ? " · loading…" : ""}
        </span>
      </div>

      {tab === "manage" && (
        <div className="space-y-4">
          {/* ── Table ── */}
          <div className="bg-white border border-gray-300 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-200 sticky top-0">
                <tr>
                  {["Day", "Course", "Room", "Start time", "End time", "Status", ""].map((h, i) => (
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
                {!refsLoaded ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                      Loading courses and rooms…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-[14px]">
                      {rows.length === 0 ? (
                        <>No classes yet. Click &ldquo;+ Add class&rdquo; to get started.</>
                      ) : (
                        "No classes match the current filters."
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isConflict = conflictId === row.id;
                    const hasConflictFlag = conflictIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-200 last:border-b-0 transition-colors ${
                          isConflict
                            ? "bg-red-50 border-l-2 border-l-red-400"
                            : idx % 2 === 0
                              ? "bg-white"
                              : "bg-gray-50"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <select
                            value={row.day}
                            onChange={(e) => updateRow(row.id, "day", e.target.value)}
                            className={selectClass}
                          >
                            {days.map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.courseCode}
                            onChange={(e) => updateRow(row.id, "courseCode", e.target.value)}
                            className={selectClass + " w-full"}
                          >
                            {courses.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} — {c.courseName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.room}
                            onChange={(e) => updateRow(row.id, "room", e.target.value)}
                            className={selectClass}
                          >
                            {rooms.map((r) => (
                              <option key={r.id} value={r.roomName}>
                                {r.roomName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={row.startTime}
                            onChange={(e) => updateRow(row.id, "startTime", e.target.value)}
                            className={selectClass + " font-mono"}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={row.endTime}
                            min={row.startTime}
                            onChange={(e) => updateRow(row.id, "endTime", e.target.value)}
                            className={`${selectClass} font-mono ${isConflict ? "border-red-400" : ""}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {hasConflictFlag ? (
                            <span className="flex items-center gap-1 text-[12px] font-semibold text-red-600">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Conflict
                            </span>
                          ) : (
                            <span className="text-[12px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="px-3 py-1.5 text-[13px] font-semibold border border-gray-300 text-gray-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="font-semibold text-gray-800 text-[13px]">
                Total: <span className="font-bold text-gray-900">{rows.length}</span>
              </p>
            </div>
          </div>

          {/* ── Conflict warning ── */}
          {conflictId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Room conflict detected on the highlighted row. Please choose a different room or time.
            </div>
          )}

          {/* ── Add class + Save row ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={!refsLoaded || courses.length === 0 || rooms.length === 0}
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add class
            </button>

            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-300 text-[13px] text-green-700 font-semibold">
                  Saved successfully.
                </span>
              )}
              <button
                type="button"
                disabled={saving || rows.length === 0 || loadingList || !refsLoaded}
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* ── Visual separator between table/save section and AI section ── */}
          <div className="relative flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200">
              <Settings2 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
                AI Assistant
              </span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
          </div>

          {/* ── AI Timetable Helper ── */}
          <div className="border border-indigo-200 bg-slate-50 rounded-sm px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-[12px] font-semibold uppercase tracking-wide text-gray-700">
                AI timetable helper
              </span>
              {aiAppliedFlash ? (
                <span className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                  <span aria-hidden>✅</span> Applied
                </span>
              ) : null}
            </div>

            {aiErrorBanner ? (
              <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                <span className="shrink-0 mt-px" aria-hidden>
                  ⚠️
                </span>
                <span>{aiErrorBanner}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-start gap-2">
              <button
                type="button"
                disabled={
                  aiBusy || rows.length === 0 || !refsLoaded || courses.length === 0 || rooms.length === 0
                }
                onClick={() => runAiOptimizer("optimize")}
                className="inline-flex items-center gap-2 rounded border border-indigo-300 bg-white px-3 py-2 text-[12px] font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-45 disabled:pointer-events-none"
              >
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Settings2 className="h-3.5 w-3.5" />
                )}
                Optimize
              </button>

              <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                <textarea
                  value={aiDraft}
                  disabled={aiBusy}
                  rows={2}
                  onChange={(e) => setAiDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    e.preventDefault();
                    if (!canAiSend || aiBusy) return;
                    runAiOptimizer("send");
                  }}
                  placeholder="Custom instruction (example: Move all CS101 to Thursday)"
                  className="w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                />
                <span className="text-[11px] text-gray-500">Enter sends; Shift + Enter newline.</span>
              </div>

              <button
                type="button"
                disabled={!canAiSend}
                onClick={() => runAiOptimizer("send")}
                className="inline-flex items-center gap-2 rounded border border-indigo-700 bg-indigo-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-indigo-800 disabled:opacity-45 disabled:pointer-events-none self-stretch md:self-auto"
              >
                {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>

              <input
                ref={aiFileInputRef}
                type="file"
                accept=".txt,.csv,.xls,.xlsx,application/pdf,image/*"
                className="hidden"
                onChange={(ev) => {
                  const file = ev.target.files?.[0];
                  ev.target.value = "";
                  setAiFile(file ?? null);
                }}
              />

              <button
                type="button"
                disabled={aiBusy}
                onClick={() => aiFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-45"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Upload
              </button>
            </div>

            {aiFile ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] text-gray-700">
                  <span className="truncate max-w-[220px]" title={aiFile.name}>
                    {aiFile.name}
                  </span>
                  <button
                    type="button"
                    disabled={aiBusy}
                    aria-label="Remove attached file"
                    onClick={() => setAiFile(null)}
                    className="rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === "weekly" && <WeeklyView rows={filteredRows} />}
    </div>
  );
}