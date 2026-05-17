const TIMETABLES_URL = "http://localhost:8080/api/timetables";

export interface NestedCourse {
  id: number;
  code: string;
  courseName: string;
}

export interface NestedRoom {
  id: number;
  roomName: string;
  roomCode: string;
}

export interface NestedLecturer {
  id: number;
  lecturerName: string;
}

/** Response shape from GET /api/timetables */
export interface ApiTimetableEntry {
  id: number;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  groupCode?: string | null;
  course: NestedCourse;
  room: NestedRoom;
  lecturer?: NestedLecturer | null;
}

export interface TimetableRequestPayload {
  semester: string;
  dayOfWeek: string;
  courseId: number;
  roomId: number;
  lecturerId?: number | null;
  startTime: string;
  endTime: string;
  groupCode?: string | null;
}

export function normalizeTimeForInput(t: string | undefined | null): string {
  if (!t || !String(t).trim()) return "08:00";
  const part = String(t).trim().split(/[.T]/)[0];
  const [hh = "0", mm = "00"] = part.split(":");
  const h = Math.min(23, Math.max(0, parseInt(hh, 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(mm, 10) || 0));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function dayDisplayFromApi(day: string): string {
  const d = (day ?? "").trim();
  if (!d) return "Monday";
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
}

export function dayToApi(display: string): string {
  return (display ?? "").trim().toUpperCase();
}

async function readError(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("Content-Type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as {
        error?: string;
        message?: string;
        rootCause?: string;
        hint?: string;
      };
      const parts = [j.rootCause, j.message, j.error]
        .map((s) => (s == null ? "" : String(s).trim()))
        .filter(Boolean);
      if (parts.length) return parts.join(" — ");
      return res.statusText;
    }
    return (await res.text()) || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function fetchTimetables(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  semester?: string
): Promise<ApiTimetableEntry[]> {
  const q = semester != null && semester.trim() !== "" ? `?semester=${encodeURIComponent(semester.trim())}` : "";
  const res = await apiFetch(`${TIMETABLES_URL}${q}`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createTimetable(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  body: TimetableRequestPayload
): Promise<ApiTimetableEntry> {
  const res = await apiFetch(TIMETABLES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function updateTimetable(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  id: number,
  body: TimetableRequestPayload
): Promise<ApiTimetableEntry> {
  const res = await apiFetch(`${TIMETABLES_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function deleteTimetable(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  id: number
): Promise<void> {
  const res = await apiFetch(`${TIMETABLES_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readError(res));
}
