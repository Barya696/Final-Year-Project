import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchTeachingAssignments,
  createTeachingAssignment,
  updateTeachingAssignment,
  deleteTeachingAssignment,
  type ApiTeachingAssignment,
  type TeachingAssignmentRequestPayload,
} from "@/services/teachingAssignmentsApi";

const API_BASE = "http://localhost:8080/api";

interface CourseOption {
  id: number;
  courseName: string;
  code: string;
}

interface LecturerOption {
  id: number;
  lecturerName: string;
}

interface GroupOption {
  id: number;
  groupName: string;
  code: string;
  semester: number;
}

interface TimetableOption {
  id: number;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  groupCode: string | null;
  course: CourseOption;
  room: { id: number; roomName: string };
}

interface AssignmentRow {
  id: number;
  timetableId: number;
  courseId: number;
  lecturerId: number;
  date: string;
  course: string;
  lecturer: string;
  avatar: string;
  avClass: string;
  type: "UEF" | "UT";
  hours: number;
  group: string;
  chapters: number;
  semester: string;
}

const AV_CLASSES = ["av-blue", "av-purple", "av-green", "av-gold"] as const;

function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function mapApiToRow(a: ApiTeachingAssignment): AssignmentRow {
  const lecturer = a.lecturer.lecturerName ?? "";
  const type: "UEF" | "UT" = a.assignmentType === "UT" ? "UT" : "UEF";
  return {
    id: a.id,
    timetableId: a.timetable?.id ?? 0,
    courseId: a.course.id,
    lecturerId: a.lecturer.id,
    date: a.assignmentDate,
    course: a.course.courseName ?? "",
    lecturer,
    avatar: initialsFromName(lecturer),
    avClass: AV_CLASSES[Number(a.id) % AV_CLASSES.length],
    type,
    hours: a.teachingHours,
    group: a.groupCode?.trim() ? a.groupCode : "-",
    chapters: a.chapterCount,
    semester: a.semester ?? "",
  };
}

interface FormState {
  timetableId: number | "";
  semester: "1" | "2";
  lecturerId: number | "";
  type: "UEF" | "UT";
  group: string;
}

export default function CourseAssignments() {
  const { apiFetch, hasRole } = useAuth();
  const canMutate = hasRole(["HOD", "Admin"]);

  const [data, setData] = useState<AssignmentRow[]>([]);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [timetables, setTimetables] = useState<TimetableOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refsError, setRefsError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "course" | "hours" | "chapters">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new" | "edit">("new");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewedLecturer, setViewedLecturer] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    timetableId: "",
    semester: "1",
    lecturerId: "",
    type: "UEF",
    group: "",
  });

  const loadAssignments = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const list = await fetchTeachingAssignments(apiFetch);
      setData(list.map(mapApiToRow));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load assignments");
      setData([]);
    } finally {
      setListLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, lRes, gRes] = await Promise.all([
          apiFetch(`${API_BASE}/timetables`),
          apiFetch(`${API_BASE}/lecturers`),
          apiFetch(`${API_BASE}/groups`),
        ]);
        if (!tRes.ok || !lRes.ok || !gRes.ok) throw new Error("Failed to load references");
        const tRaw = (await tRes.json()) as TimetableOption[];
        const lRaw = (await lRes.json()) as LecturerOption[];
        const gRaw = (await gRes.json()) as GroupOption[];
        if (!cancelled) {
          setTimetables(tRaw);
          setLecturers(lRaw);
          setGroups(gRaw);
          setRefsError("");
        }
      } catch {
        if (!cancelled) setRefsError("Could not load timetables, lecturers, or groups.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const lecturerFilterOptions = useMemo(
    () => [...lecturers].map((l) => l.lecturerName).sort((a, b) => a.localeCompare(b)),
    [lecturers]
  );
  const courseFilterOptions = useMemo(
    () => [...new Set(data.map((d) => d.course))].sort((a, b) => a.localeCompare(b)),
    [data]
  );
  const selectedTimetable = useMemo(
    () => timetables.find((t) => t.id === form.timetableId),
    [timetables, form.timetableId]
  );

  const timetablesForSemester = timetables;

  const newAssignmentDisabledReason = useMemo(() => {
    if (!canMutate) return "Only HOD or Admin can create assignments.";
    if (timetablesForSemester.length === 0) return "No timetable slots found. Add timetables first.";
    if (lecturers.length === 0) return "No lecturers found. Add lecturers first.";
    if (groups.length === 0) return "No groups found. Add groups first.";
    return null;
  }, [canMutate, timetablesForSemester.length, lecturers.length, groups.length]);

  const filteredSorted = useMemo(() => {
    const filtered = data.filter((r) => {
      const matchLecturer = !filterLecturer || r.lecturer === filterLecturer;
      const matchSem = !filterSemester || r.semester === filterSemester;
      const matchCourse = !filterCourse || r.course === filterCourse;
      return matchLecturer && matchSem && matchCourse;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortKey) {
        case "date":
          va = new Date(a.date).getTime();
          vb = new Date(b.date).getTime();
          break;
        case "course":
          va = a.course.toLowerCase();
          vb = b.course.toLowerCase();
          break;
        case "hours":
          va = a.hours;
          vb = b.hours;
          break;
        case "chapters":
          va = a.chapters;
          vb = b.chapters;
          break;
        default:
          break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [data, filterLecturer, filterSemester, filterCourse, sortKey, sortDir]);

  const sortTable = (key: "date" | "course" | "hours" | "chapters") => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const clearFilters = () => {
    setFilterLecturer("");
    setFilterSemester("");
    setFilterCourse("");
  };

  const resetForm = () => {
    const t0 = timetables[0];
    const l0 = lecturers[0];
    const g0 = groups[0];
    setForm({
      timetableId: t0?.id ?? "",
      semester: "1",
      lecturerId: l0?.id ?? "",
      type: "UEF",
      group: g0?.code ?? t0?.groupCode ?? "",
    });
    setEditingId(null);
    setSaveError("");
  };

  const openModal = () => {
    resetForm();
    setModalMode("new");
    setModalOpen(true);
  };

  const openView = (item: AssignmentRow) => {
    setViewedLecturer(item.lecturer);
    setViewModalOpen(true);
  };

  const openEdit = (item: AssignmentRow) => {
    setEditingId(item.id);
    setForm({
      timetableId: item.timetableId || "",
      semester: item.semester === "2" ? "2" : "1",
      lecturerId: item.lecturerId,
      type: item.type,
      group: item.group === "-" ? "" : item.group,
    });
    setSaveError("");
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewedLecturer("");
  };

  async function handleDelete(item: AssignmentRow) {
    if (!canMutate) return;
    if (!window.confirm("Delete this teaching assignment?")) return;
    setListError("");
    try {
      await deleteTeachingAssignment(apiFetch, item.id);
      await loadAssignments();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const submitForm = async () => {
    if (!canMutate) return;
    if (form.timetableId === "" || form.lecturerId === "") {
      setSaveError("Select a timetable course slot and a lecturer.");
      return;
    }
    const payload: TeachingAssignmentRequestPayload = {
      timetableId: form.timetableId,
      semester: form.semester,
      lecturerId: form.lecturerId,
      assignmentType: form.type,
      groupCode: form.group.trim() || null,
    };
    setSaving(true);
    setSaveError("");
    try {
      if (modalMode === "edit" && editingId != null) {
        await updateTeachingAssignment(apiFetch, editingId, payload);
      } else {
        await createTeachingAssignment(apiFetch, payload);
      }
      await loadAssignments();
      closeModal();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return {
      main: dt.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
      sub: dt.toLocaleDateString('en-GB', { weekday:'short' }),
    };
  };

  return (
    <div className="space-y-3">
      {listError ? (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{listError}</div>
      ) : null}
      {refsError ? (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{refsError}</div>
      ) : null}
      <div  className="hero-stats-section" >
      
      </div>


      <style>{`/* style from snippet */
:root {
  --bg: #f3f4f6;
  --white: #ffffff;
  --border: #d1d5db;
  --thead-bg: #455060;
  --thead-text: #ffffff;
  --text: #1a1f2e;
  --text2: #4b5563;
  --text3: #9ca3af;
  --accent: #1d3557;
  --row-alt: #f9fafb;
  --row-hover: #eef2f7;
  --pending-bg: #eff6ff;
  --pending-border: #3b82f6;
  --pending-text: #1d4ed8;
  --returned-bg: #fff7ed;
  --returned-border: #f97316;
  --returned-text: #c2410c;
  --validated-bg: #f0fdf4;
  --validated-border: #22c55e;
  --validated-text: #15803d;
  --btn-bg: #2d3a4a;
  --btn-text: #ffffff;
  --radius: 0px;
}
.page-wrapper { max-width: 1400px; margin:0 auto;}
.btn-new { display:inline-flex; align-items:center; gap:8px; background:var(--btn-bg); color:var(--btn-text); border:none; padding:11px 20px; border-radius:0; font-family:'Inter',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:background 0.15s; white-space:nowrap; letter-spacing:0.01em; }
.btn-new:hover { background:#1a2535; }
.filter-bar { background:var(--bg); border:1px solid var(--border); border-radius:0; padding:16px; display:flex; align-items:center; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.filter-label { font-size:13px; color:var(--text2); font-weight:500; white-space:nowrap; }
.filter-group { display:flex; align-items:center; gap:0; flex:1; min-width:160px; }
.select-custom { background: var(--white); border:1px solid var(--border); border-radius:0; color:var(--text); font-family:'Inter',sans-serif; font-size:13px; padding:8px 32px 8px 12px; cursor:pointer; outline:none; transition:border-color .15s; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%234b5563' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center; width:100%; }
.filter-bar button { background: var(--white); border:1px solid var(--border); color:var(--text2); padding:8px 16px; border-radius:0; font-family:'Inter',sans-serif; font-size:13px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.filter-bar button:hover { background:var(--bg); color:var(--text); }
.table-container { background:var(--bg); border:1px solid var(--border); border-radius:0; overflow:hidden; }
.table-toolbar { display:flex; align-items:center; justify-content:space-between; padding:16px; border-bottom:1px solid var(--border); background:var(--bg); }
.table-info { font-size:13px; color:var(--text2); }
.table-info strong { color:var(--text); }
table { width:100%; border-collapse:collapse; background:var(--white); }
thead tr { background: var(--thead-bg); }
th { padding:10px 12px; text-align:left; font-size:13px; font-weight:600; color:var(--thead-text); white-space:nowrap; letter-spacing:0.01em; border-right:1px solid rgba(255,255,255,0.08); }
th:last-child { border-right:none; }
tbody tr { border-bottom:1px solid var(--border); transition:background 0.1s; background:var(--white); }
tbody tr:nth-child(even){background:#ffffff;} tbody tr:hover{background:#f9fafb;}td{padding:8px 12px;font-size:13px;vertical-align:middle;color:var(--text);border-right:1px solid var(--border);}td:last-child{border-right:none;}.date-cell{font-size:13px;color:var(--text);white-space:nowrap;font-weight:500;}.date-cell .date-sub{font-size:11px;color:var(--text3);font-weight:400;margin-top:1px;}.course-name{font-weight:600;color:var(--text);max-width:240px;}.lecturer-cell{display:flex;align-items:center;gap:9px;}.avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;border:1px solid var(--border);}.av-blue{background:#dbeafe;color:#1d4ed8;}.av-purple{background:#ede9fe;color:#6d28d9;}.av-green{background:#dcfce7;color:#15803d;}.av-gold{background:#fef9c3;color:#a16207;}.lecturer-name{font-weight:500;font-size:13px;color:var(--text);}.badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:0;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid;letter-spacing:0.02em;}.badge-ue{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd;}.badge-ut{background:#f5f3ff;color:#6d28d9;border-color:#c4b5fd;}.hours-cell{font-size:13px;font-weight:700;color:var(--text);}.group-tag{display:inline-flex;align-items:center;background:#f1f5f9;border:1px solid var(--border);border-radius:0;padding:4px 9px;font-size:12px;color:var(--text);font-weight:600;letter-spacing:0.03em;}.table-footer{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--border);background:var(--row-alt);gap:12px;flex-wrap:wrap;}.page-info{font-size:12px;color:var(--text2);}.pagination{display:flex;gap:3px;}.page-btn{min-width:32px;height:32px;border-radius:0;border:1px solid var(--border);background:var(--white);color:var(--text2);cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;padding:0 8px;display:flex;align-items:center;justify-content:center;transition:all .12s;}.page-btn:hover{background:var(--bg);color:var(--text);}.page-btn.active{background:var(--thead-bg);border-color:var(--thead-bg);color:#fff;font-weight:600;}
/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.modal-overlay.open { opacity: 1; pointer-events: all; }
.modal {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 0;
  width: 580px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  transform: translateY(16px);
  transition: transform 0.2s ease;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}
.modal-overlay.open .modal { transform: translateY(0); }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  background: var(--thead-bg);
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--thead-text);
}
.modal-close {
  width: 30px;
  height: 30px;
  border-radius: 0;
  border: 1px solid rgba(255,255,255,0.3);
  background: transparent;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.modal-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group.full { grid-column: 1 / -1; }
label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text2);
}
input[type="text"], input[type="date"], input[type="number"], textarea, .modal select {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 0;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
input:focus, textarea:focus, .modal select:focus { border-color: var(--accent); }
.modal-footer {
  padding: 16px 22px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: var(--row-alt);
}
.btn-cancel {
  background: var(--white);
  border: 1px solid var(--border);
  color: var(--text2);
  padding: 9px 18px;
  border-radius: 0;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover { background: var(--bg); color: var(--text); }
.btn-submit {
  background: var(--thead-bg);
  border: none;
  color: var(--thead-text);
  padding: 9px 20px;
  border-radius: 0;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-submit:hover { background: #1a2535; }
.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.type-option {
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 10px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  background: var(--white);
}
.type-option input { display: none; }
.type-option span {
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
}
.type-option:has(input:checked) {
  border-color: var(--thead-bg);
  background: var(--row-hover);
}
.type-option:has(input:checked) span { color: var(--thead-bg); }
.view-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
.view-modal-overlay.open { opacity: 1; pointer-events: all; }
.view-modal { background: var(--white); border: 1px solid var(--border); border-radius: 0; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; transform: translateY(16px); transition: transform 0.2s ease; box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
.view-modal-overlay.open .view-modal { transform: translateY(0); }
.view-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); background: var(--thead-bg); }
.view-modal-title { font-size: 16px; font-weight: 700; color: #fff; }
.view-modal-close { width: 30px; height: 30px; border-radius: 0; border: 1px solid rgba(255,255,255,0.3); background: transparent; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.view-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.view-modal-body { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.lecturer-summary { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--row-alt); border: 1px solid var(--border); }
.avatar-lg { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; border: 2px solid var(--border); }
.lecturer-summary-info { display: flex; flex-direction: column; gap: 3px; }
.lecturer-summary-name { font-size: 15px; font-weight: 700; color: var(--text); }
.lecturer-summary-sub { font-size: 12px; color: var(--text3); }
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat-card { background: var(--row-alt); border: 1px solid var(--border); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.stat-value { font-size: 22px; font-weight: 700; color: var(--thead-bg); }
.stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text3); }
.
.course-list-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text2); padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.course-list { display: flex; flex-direction: column; gap: 0; }
.course-list-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); gap: 10px; }
.course-list-item:last-child { border-bottom: none; }
.course-list-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; }
.course-list-meta { display: flex; gap: 8px; align-items: center; }
.view-modal-footer { padding: 14px 22px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; background: var(--row-alt); }
.actions-cell { display: flex; gap: 8px; align-items: center; }
.btn-icon { width: 32px; height: 32px; border-radius: 0; border: 1px solid var(--border); background: var(--white); color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-size: 14px; }
.btn-icon:hover { background: var(--bg); border-color: var(--accent); color: var(--accent); }
.hero-section { padding: 24px 0; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.hero-title { font-size: 32px; font-weight: 700; color: var(--text); margin: 0 0 8px 0; }
.hero-description { font-size: 15px; color: var(--text3); margin: 0; }
.stats-section { display: flex; width: 600px; align-items: center; justify-content: center; gap: 0; padding: 12px 16px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0; }
.stat-item { display: flex; align-items: center; gap: 6px; padding: 0 14px; position: relative; }
.stat-item:not(:last-child)::after { content: ''; position: absolute; right: 0; width: 2px; height: 20px; background: #d1d5db; }
.stat-value { font-size: 18px; font-weight: 800; color: #4f9ef8; min-width: 45px; }
.stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
/* Animations */
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`}</style>

      <div className="page-wrapper">
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'12px', animation:'fadeDown 0.5s ease both'}}>
          <button
            type="button"
            className="btn-new"
            disabled={newAssignmentDisabledReason != null}
            style={{ opacity: newAssignmentDisabledReason != null ? 0.5 : 1, cursor: newAssignmentDisabledReason != null ? "not-allowed" : "pointer" }}
            onClick={openModal}
            title={newAssignmentDisabledReason ?? undefined}
          >
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z"/></svg>
            New Assignment
          </button>
        </div>

        <div className="filter-bar" style={{ marginBottom:'12px' }}>
          <span className="filter-label">Filter</span>
          <div className="filter-group">
            <select className="select-custom" value={filterLecturer} onChange={(e) => setFilterLecturer(e.target.value)}>
              <option value="">All Lecturers</option>
              {lecturerFilterOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select className="select-custom" value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
              <option value="">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
          <div className="filter-group">
            <select className="select-custom" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
              <option value="">All Courses</option>
              {courseFilterOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <button className="btn-clear" onClick={clearFilters}>Clear filters</button>
        </div>

        <div className="table-container">
          <div className="table-toolbar">
          <div className="table-info"><strong>Course assigned — For current semester</strong>{listLoading ? " (loading…)" : ""}</div>
        </div>
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => sortTable('date')}>Date</th>
                <th className="sortable" onClick={() => sortTable('course')}>Course Name</th>
                <th>Lecturer</th>
                <th>Type</th>
                <th className="sortable" onClick={() => sortTable('hours')}>Hours</th>
                <th>Group</th>
                <th className="sortable" onClick={() => sortTable('chapters')}>Chapters</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length === 0 && !listLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text3)" }}>
                    No assignments yet{data.length > 0 ? " match your filters." : ". Use New Assignment (HOD/Admin) to add one."}
                  </td>
                </tr>
              ) : null}
              {filteredSorted.map((item) => {
                const d = formatDate(item.date);
                const isUEF = item.type === 'UEF';
                return (
                  <tr key={item.id}>
                    <td className="date-cell"><div>{d.main}</div><div className="date-sub">{d.sub}</div></td>
                    <td className="course-name">{item.course}</td>
                    <td><div className="lecturer-cell"><div className={`avatar ${item.avClass}`}>{item.avatar}</div><span className="lecturer-name">{item.lecturer}</span></div></td>
                    <td><span className={`badge ${isUEF ? 'badge-ue' : 'badge-ut'}`}>{isUEF ? "UE Fondamental" : "Transversal"}</span></td>
                    <td className="hours-cell">{item.hours}H</td>
                    <td><span className="group-tag">{item.group}</span></td>
                    <td className="chapter-cell">{item.chapters}</td>
                    <td>
                      <div className="actions-cell">
                        <button type="button" className="btn-icon" title="View" onClick={() => openView(item)}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        {canMutate ? (
                          <>
                            <button type="button" className="btn-icon" title="Edit" onClick={() => openEdit(item)}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                            </button>
                            <button type="button" className="btn-icon" title="Delete" onClick={() => void handleDelete(item)}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-footer">
            <div className="page-info">Page 1 of 1 — {filteredSorted.length} total records</div>
            <div className="pagination"><button className="page-btn active">1</button></div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {modalMode === 'edit' ? 'Edit Assignment' : 'New Assignment'}
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {saveError ? (
                <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 }}>
                  {saveError}
                </div>
              ) : null}
              <div className="form-group full">
                <label>Semester</label>
                <select value={form.semester} onChange={(e) => setForm((prev) => ({ ...prev, semester: e.target.value === "2" ? "2" : "1" }))}>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
              <div className="form-group full">
                <label>Course</label>
                <select
                  value={form.timetableId === "" ? "" : String(form.timetableId)}
                  onChange={(e) => {
                    const selectedId = e.target.value === "" ? "" : Number(e.target.value);
                    const slot = timetables.find((t) => t.id === selectedId);
                    setForm((prev) => ({
                      ...prev,
                      timetableId: selectedId,
                      group: slot?.groupCode ?? prev.group,
                    }));
                  }}
                >
                  <option value="">Select timetable course slot…</option>
                  {timetablesForSemester.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.course.code} — {t.course.courseName} ({t.dayOfWeek}, {t.startTime}-{t.endTime}, {t.room.roomName})
                    </option>
                  ))}
                </select>
              </div>
              {selectedTimetable ? (
                <div className="form-group full" style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #d1d5db", fontSize: 13, color: "#4b5563" }}>
                  <strong>Timetable info:</strong> {selectedTimetable.dayOfWeek}, {selectedTimetable.startTime}-{selectedTimetable.endTime}
                  {" · "}Room: {selectedTimetable.room.roomName}
                  {" · "}Duration: {Math.max(1, Math.ceil((Number(selectedTimetable.endTime.slice(0, 2)) * 60 + Number(selectedTimetable.endTime.slice(3, 5)) - (Number(selectedTimetable.startTime.slice(0, 2)) * 60 + Number(selectedTimetable.startTime.slice(3, 5)))) / 60))}h
                </div>
              ) : null}
              <div className="form-group full">
                <label>Course Type</label>
                <div className="type-toggle">
                  <label className="type-option">
                    <input type="radio" name="type" value="UEF" checked={form.type === "UEF"} onChange={() => setForm((prev) => ({ ...prev, type: "UEF" }))} />
                    <span>Unité d'Enseignement Fondamental</span>
                  </label>
                  <label className="type-option">
                    <input type="radio" name="type" value="UT" checked={form.type === "UT"} onChange={() => setForm((prev) => ({ ...prev, type: "UT" }))} />
                    <span>Unité Transversal</span>
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Lecturer</label>
                  <select
                    value={form.lecturerId === "" ? "" : String(form.lecturerId)}
                    onChange={(e) => setForm((prev) => ({ ...prev, lecturerId: e.target.value === "" ? "" : Number(e.target.value) }))}
                  >
                    <option value="">Select lecturer…</option>
                    {lecturers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lecturerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Group</label>
                  <select value={form.group} onChange={(e) => setForm((prev) => ({ ...prev, group: e.target.value }))}>
                    <option value="">Select group…</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.code}>
                        {g.code} — {g.groupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button
                type="button"
                className="btn-submit"
                disabled={saving || form.timetableId === "" || form.lecturerId === ""}
                onClick={() => void submitForm()}
              >
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && viewedLecturer && (
        <div className={`view-modal-overlay ${viewModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeViewModal(); }}>
          <div className="view-modal">
            <div className="view-modal-header">
              <div className="view-modal-title">Lecturer Assignment Overview</div>
              <button className="view-modal-close" onClick={closeViewModal}>✕</button>
            </div>
            <div className="view-modal-body">
              {(() => {
                const courses = data.filter(r => r.lecturer === viewedLecturer);
                const totalHours = courses.reduce((s, r) => s + r.hours, 0);
                const totalChapters = courses.reduce((s, r) => s + r.chapters, 0);
                const first = courses[0];
                const avClass = first ? first.avClass : 'av-blue';
                const avatar = first ? first.avatar : '?';
                
                return (
                  <>
                    <div className="lecturer-summary">
                      <div className={`avatar-lg ${avClass}`}>{avatar}</div>
                      <div className="lecturer-summary-info">
                        <div className="lecturer-summary-name">{viewedLecturer}</div>
                        <div className="lecturer-summary-sub">{courses.length} course{courses.length !== 1 ? 's' : ''} assigned</div>
                      </div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-card">
                        <div className="stat-value">{courses.length}</div>
                        <div className="stat-label">Courses</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{totalHours}H</div>
                        <div className="stat-label">Total Hours</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{totalChapters}</div>
                        <div className="stat-label">Total Chapters</div>
                      </div>
                    </div>
                    <div>
                      <div className="course-list-title">Assigned Courses</div>
                      <div className="course-list">
                        {courses.map((c, idx) => (
                          <div key={idx} className="course-list-item">
                            <span className="course-list-name">{c.course}</span>
                            <div className="course-list-meta">
                              <span className={`badge ${c.type === 'UEF' ? 'badge-ue' : 'badge-ut'}`}>{c.type === 'UEF' ? 'UEF' : 'UT'}</span>
                              <span className="group-tag">{c.group}</span>
                              <span className="hours-cell" style={{fontSize:'12px'}}>{c.hours}H</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="view-modal-footer">
              <button className="btn-cancel" onClick={closeViewModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

