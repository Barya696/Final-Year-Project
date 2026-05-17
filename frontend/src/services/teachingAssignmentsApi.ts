/** API types and CRUD for /api/teaching-assignments (schedule table). */

export interface ApiTeachingAssignmentCourse {
  id: number;
  courseName: string;
  code: string;
}

export interface ApiTeachingAssignmentLecturer {
  id: number;
  lecturerName: string;
}

export interface ApiTeachingAssignmentRoom {
  id: number;
  roomName: string;
}

export interface ApiTeachingAssignmentTimetable {
  id: number;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  groupCode: string | null;
  room: ApiTeachingAssignmentRoom;
}

export interface ApiTeachingAssignment {
  id: number;
  assignmentDate: string;
  semester: string;
  assignmentType: string;
  teachingHours: number;
  groupCode: string | null;
  chapterCount: number;
  course: ApiTeachingAssignmentCourse;
  lecturer: ApiTeachingAssignmentLecturer;
  timetable: ApiTeachingAssignmentTimetable;
}

export interface TeachingAssignmentRequestPayload {
  timetableId: number;
  lecturerId: number;
  assignmentType: string;
  assignmentDate?: string;
  semester?: string;
  teachingHours?: number;
  groupCode?: string | null;
  chapterCount?: number;
}

const BASE = "http://localhost:8080/api/teaching-assignments";

export async function fetchTeachingAssignments(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  semester?: string
): Promise<ApiTeachingAssignment[]> {
  const q = semester?.trim() ? `?semester=${encodeURIComponent(semester.trim())}` : "";
  const res = await apiFetch(`${BASE}${q}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      rootCause?: string;
    };
    const detail =
      body.rootCause ??
      body.message ??
      body.error ??
      `HTTP ${res.status}`;
    throw new Error(`Failed to load teaching assignments: ${detail}`);
  }
  return res.json() as Promise<ApiTeachingAssignment[]>;
}

export async function createTeachingAssignment(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  body: TeachingAssignmentRequestPayload
): Promise<ApiTeachingAssignment> {
  const res = await apiFetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to create assignment");
  }
  return res.json() as Promise<ApiTeachingAssignment>;
}

export async function updateTeachingAssignment(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  id: number,
  body: TeachingAssignmentRequestPayload
): Promise<ApiTeachingAssignment> {
  const res = await apiFetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to update assignment");
  }
  return res.json() as Promise<ApiTeachingAssignment>;
}

export async function deleteTeachingAssignment(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  id: number
): Promise<void> {
  const res = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to delete assignment");
  }
}
