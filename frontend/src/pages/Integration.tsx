"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = "http://localhost:8080/api";

interface Lecturer {
  id: number;
  lecturerName: string;
  grade: string;
  department: string;
}

interface Course {
  id: number;
  courseName: string;
  code: string;
  chapters: number;
  department: string;
  courseType?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Room {
  id: number;
  roomName: string;
  roomCode: string;
}

interface Department {
  id: number;
  departmentName: string;
  hod: string;
  numberOfLecturers: number;
}

interface Group {
  id: number;
  groupName: string;
  code: string;
  level: string;
  semester: string;
}

// ── Shared style constants ────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-gray-500 text-[13px] text-gray-900 placeholder-gray-400 rounded-none";
const selectCls =
  "w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-gray-500 text-[13px] text-gray-900 rounded-none cursor-pointer";
const labelCls =
  "block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide";

const getGradeBadgeClass = (grade: string): string => {
  const map: Record<string, string> = {
    "Associate Professor": "bg-blue-100 text-blue-800 border-blue-300",
    "Full Professor": "bg-purple-100 text-purple-800 border-purple-300",
    Professor: "bg-purple-100 text-purple-800 border-purple-300",
    "Assistant Professor": "bg-green-100 text-green-800 border-green-300",
    "Senior Lecturer": "bg-amber-100 text-amber-800 border-amber-300",
  };
  return map[grade] ?? "bg-gray-100 text-gray-800 border-gray-300";
};

// ── Shared Modal wrapper ──────────────────────────────────────────────────────
const Modal = ({
  title,
  onClose,
  onSave,
  saveLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white border border-gray-300 w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-gray-50 shrink-0">
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
          <X size={18} className="text-gray-600" />
        </button>
      </div>
      {/* Body */}
      <div className="px-6 py-5 space-y-4 overflow-y-auto">{children}</div>
      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-gray-300 bg-gray-50 justify-end shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-semibold hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-5 py-2 bg-gray-800 text-white text-[13px] font-semibold hover:bg-gray-700 transition-colors"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  </div>
);

// ── Shared table shell ────────────────────────────────────────────────────────
const TableShell = ({
  label,
  count,
  onAdd,
  addLabel,
  search,
  onSearch,
  headers,
  children,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
  search?: string;
  onSearch?: (v: string) => void;
  headers: { label: string; center?: boolean }[];
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    {/* Filter bar */}
    <div className="bg-gray-50 border border-gray-300">
      <div className="px-6 py-3 flex items-center gap-4 border-b border-gray-300 flex-wrap">
        {onSearch !== undefined && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 w-56"
            />
          </div>
        )}
        <span className="inline-block px-2 py-0.5 text-[11px] font-semibold border rounded bg-amber-100 text-amber-800 border-amber-300">
          {count} record{count !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onAdd}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-[13px] font-semibold hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {addLabel}
        </button>
      </div>
      <div className="h-1.5 bg-gray-800" />
    </div>

    {/* Table */}
    <div className="bg-white border border-gray-300 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-700 sticky top-0">
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                className={`px-3 py-2 text-[13px] font-medium text-white whitespace-nowrap ${h.center ? "text-center" : "text-left"}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">{children}</tbody>
      </table>
      <div className="flex items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="font-semibold text-gray-800 text-[13px]">
          Total: <span className="font-bold text-gray-900">{count}</span>
        </p>
      </div>
    </div>
  </div>
);

// ── Action buttons ────────────────────────────────────────────────────────────
const ActionButtons = ({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="flex items-center gap-1">
    <button
      onClick={onEdit}
      className="px-3 py-1 text-[12px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      Edit
    </button>
    <button
      onClick={onDelete}
      className="px-3 py-1 text-[12px] font-semibold text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Integration = () => {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState("lecturers");
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchLecturers, setSearchLecturers] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lecturer form
  const [newLecturerName, setNewLecturerName] = useState("");
  const [newLecturerGrade, setNewLecturerGrade] = useState("Professor");
  const [newLecturerDepartment, setNewLecturerDepartment] = useState("Computer Science");

  // Course form
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseDepartment, setNewCourseDepartment] = useState("Computer Science");
  const [newCourseType, setNewCourseType] = useState("Core");
  const [newCourseChapters, setNewCourseChapters] = useState<string[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // Room form
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");

  // Department form
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentHod, setNewDepartmentHod] = useState("");
  const [newDepartmentLecturers, setNewDepartmentLecturers] = useState("");

  // Group form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCode, setNewGroupCode] = useState("");
  const [newGroupLevel, setNewGroupLevel] = useState("1");
  const [newGroupSemester, setNewGroupSemester] = useState("1");

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [lecturersRes, coursesRes, roomsRes, departmentsRes, groupsRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/lecturers`),
        apiFetch(`${API_BASE_URL}/courses`),
        apiFetch(`${API_BASE_URL}/rooms`),
        apiFetch(`${API_BASE_URL}/departments`),
        apiFetch(`${API_BASE_URL}/groups`),
      ]);
      if (!lecturersRes.ok || !coursesRes.ok || !roomsRes.ok || !departmentsRes.ok || !groupsRes.ok)
        throw new Error("Failed to fetch data from server");
      const [lecturersData, coursesData, roomsData, departmentsData, groupsData] = await Promise.all([
        lecturersRes.json(), coursesRes.json(), roomsRes.json(), departmentsRes.json(), groupsRes.json(),
      ]);
      setLecturers(lecturersData);
      setCourses(coursesData);
      setRooms(roomsData);
      setDepartments(departmentsData);
      setGroups(groupsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, [apiFetch]);

  // ── Lecturer handlers ───────────────────────────────────────────────────────
  const handleEditLecturer = (l: Lecturer) => {
    setEditingId(l.id); setNewLecturerName(l.lecturerName);
    setNewLecturerGrade(l.grade); setNewLecturerDepartment(l.department);
    setShowEditModal(true);
  };
  const handleCloseLecturerModal = () => {
    setNewLecturerName(""); setNewLecturerGrade("Professor");
    setNewLecturerDepartment("Computer Science");
    setShowCreateModal(false); setShowEditModal(false); setEditingId(null);
  };
  const handleSaveLecturer = async () => {
    if (!newLecturerName.trim()) return alert("Please fill in all fields");
    const body = JSON.stringify({ lecturerName: newLecturerName, grade: newLecturerGrade, department: newLecturerDepartment });
    try {
      const res = editingId
        ? await apiFetch(`${API_BASE_URL}/lecturers/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        : await apiFetch(`${API_BASE_URL}/lecturers`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) throw new Error();
      await fetchAllData(); handleCloseLecturerModal();
    } catch { alert("Error saving lecturer"); }
  };
  const handleDeleteLecturer = async (id: number) => {
    if (!confirm("Delete this lecturer?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/lecturers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch { alert("Error deleting lecturer"); }
  };

  // ── Course handlers ─────────────────────────────────────────────────────────
  const handleEditCourse = (c: Course) => {
    setEditingId(c.id); setNewCourseName(c.courseName); setNewCourseCode(c.code);
    setNewCourseDepartment(c.department); setNewCourseType(c.courseType || "Core");
    setNewCourseChapters([]); setShowEditModal(true);
  };
  const handleCloseCourseModal = () => {
    setNewCourseName(""); setNewCourseCode(""); setNewCourseDepartment("Computer Science");
    setNewCourseType("Core"); setNewCourseChapters([]); setNewChapterTitle("");
    setShowCreateModal(false); setShowEditModal(false); setEditingId(null);
  };
  const handleSaveCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) return alert("Please fill in all required fields");
    if (newCourseChapters.length === 0) return alert("Please add at least one chapter");
    const body = JSON.stringify({ courseName: newCourseName, code: newCourseCode, chapters: newCourseChapters.length, department: newCourseDepartment, courseType: newCourseType });
    try {
      const res = editingId
        ? await apiFetch(`${API_BASE_URL}/courses/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        : await apiFetch(`${API_BASE_URL}/courses`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) throw new Error();
      if (!editingId) {
        const created = await res.json();
        for (let i = 0; i < newCourseChapters.length; i++) {
          await apiFetch(`${API_BASE_URL}/chapters`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapterName: newCourseChapters[i], chapterNumber: i + 1, courseId: created.id }),
          });
        }
      }
      await fetchAllData(); handleCloseCourseModal();
    } catch { alert("Error saving course"); }
  };
  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Delete this course?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/courses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch { alert("Error deleting course"); }
  };
  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return;
    setNewCourseChapters([...newCourseChapters, newChapterTitle]);
    setNewChapterTitle("");
  };

  // ── Room handlers ───────────────────────────────────────────────────────────
  const handleEditRoom = (r: Room) => {
    setEditingId(r.id); setNewRoomName(r.roomName); setNewRoomCode(r.roomCode);
    setShowEditModal(true);
  };
  const handleCloseRoomModal = () => {
    setNewRoomName(""); setNewRoomCode("");
    setShowCreateModal(false); setShowEditModal(false); setEditingId(null);
  };
  const handleSaveRoom = async () => {
    if (!newRoomName.trim() || !newRoomCode.trim()) return alert("Please fill in all fields");
    const body = JSON.stringify({ roomName: newRoomName, roomCode: newRoomCode });
    try {
      const res = editingId
        ? await apiFetch(`${API_BASE_URL}/rooms/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        : await apiFetch(`${API_BASE_URL}/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) throw new Error();
      await fetchAllData(); handleCloseRoomModal();
    } catch { alert("Error saving room"); }
  };
  const handleDeleteRoom = async (id: number) => {
    if (!confirm("Delete this room?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch { alert("Error deleting room"); }
  };

  // ── Department handlers ─────────────────────────────────────────────────────
  const handleEditDepartment = (d: Department) => {
    setEditingId(d.id); setNewDepartmentName(d.departmentName);
    setNewDepartmentHod(d.hod); setNewDepartmentLecturers(d.numberOfLecturers.toString());
    setShowEditModal(true);
  };
  const handleCloseDepartmentModal = () => {
    setNewDepartmentName(""); setNewDepartmentHod(""); setNewDepartmentLecturers("0");
    setShowCreateModal(false); setShowEditModal(false); setEditingId(null);
  };
  const handleSaveDepartment = async () => {
    if (!newDepartmentName.trim() || !newDepartmentHod.trim()) return alert("Please fill in all fields");
    const body = JSON.stringify({ departmentName: newDepartmentName, hod: newDepartmentHod, numberOfLecturers: parseInt(newDepartmentLecturers) || 0 });
    try {
      const res = editingId
        ? await apiFetch(`${API_BASE_URL}/departments/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        : await apiFetch(`${API_BASE_URL}/departments`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) throw new Error();
      await fetchAllData(); handleCloseDepartmentModal();
    } catch { alert("Error saving department"); }
  };
  const handleDeleteDepartment = async (id: number) => {
    if (!confirm("Delete this department?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/departments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch { alert("Error deleting department"); }
  };

  // ── Group handlers ──────────────────────────────────────────────────────────
  const handleEditGroup = (g: Group) => {
    setEditingId(g.id); setNewGroupName(g.groupName); setNewGroupCode(g.code);
    setNewGroupLevel(g.level); setNewGroupSemester(g.semester);
    setShowEditModal(true);
  };
  const handleCloseGroupModal = () => {
    setNewGroupName(""); setNewGroupCode(""); setNewGroupLevel("1"); setNewGroupSemester("1");
    setShowCreateModal(false); setShowEditModal(false); setEditingId(null);
  };
  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return alert("Please fill in all fields");
    const body = JSON.stringify({ groupName: newGroupName, code: newGroupCode, level: newGroupLevel, semester: newGroupSemester });
    try {
      const res = editingId
        ? await apiFetch(`${API_BASE_URL}/groups/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        : await apiFetch(`${API_BASE_URL}/groups`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) throw new Error();
      await fetchAllData(); handleCloseGroupModal();
    } catch { alert("Error saving group"); }
  };
  const handleDeleteGroup = async (id: number) => {
    if (!confirm("Delete this group?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch { alert("Error deleting group"); }
  };

  const filteredLecturers = lecturers.filter((l) =>
    l.lecturerName.toLowerCase().includes(searchLecturers.toLowerCase())
  );

  const tabs = [
    { id: "lecturers", label: "Lecturers" },
    { id: "courses", label: "Courses" },
    { id: "rooms", label: "Rooms" },
    { id: "departments", label: "Departments" },
    { id: "groups", label: "Groups" },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ─── Tab Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-300">
        <div className="px-6 py-0 flex items-center gap-1 border-b border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowCreateModal(false); setShowEditModal(false); setEditingId(null); }}
              className={`px-5 py-3 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-gray-800 text-gray-900 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="h-1.5 bg-gray-800" />
      </div>

      {/* ─── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ─── Loading ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-gray-300">
          <div className="w-5 h-5 border border-current border-t-transparent rounded-full animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500 text-[14px]">Loading…</span>
        </div>
      ) : (
        <>
          {/* ── LECTURERS ── */}
          {activeTab === "lecturers" && (
            <TableShell
              label="Lecturers"
              count={filteredLecturers.length}
              onAdd={() => setShowCreateModal(true)}
              addLabel="Add Lecturer"
              search={searchLecturers}
              onSearch={setSearchLecturers}
              headers={[
                { label: "Name" }, { label: "Grade" }, { label: "Department" }, { label: "Actions", center: true },
              ]}
            >
              {filteredLecturers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-[14px]">No lecturers found.</td></tr>
              ) : filteredLecturers.map((l, idx, arr) => (
                <tr key={l.id} className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                  <td className="px-3 py-2 text-[14px] text-gray-900 font-medium whitespace-nowrap">{l.lecturerName}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getGradeBadgeClass(l.grade)}`}>
                      {l.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[13px] text-gray-600">{l.department}</td>
                  <td className="px-3 py-2 text-center"><ActionButtons onEdit={() => handleEditLecturer(l)} onDelete={() => handleDeleteLecturer(l.id)} /></td>
                </tr>
              ))}
            </TableShell>
          )}

          {/* ── COURSES ── */}
          {activeTab === "courses" && (
            <TableShell
              label="Courses"
              count={courses.length}
              onAdd={() => setShowCreateModal(true)}
              addLabel="Add Course"
              headers={[
                { label: "Course Name" }, { label: "Code" }, { label: "Chapters", center: true },
                { label: "Department" }, { label: "Type" }, { label: "Actions", center: true },
              ]}
            >
              {courses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-[14px]">No courses found.</td></tr>
              ) : courses.map((c, idx, arr) => (
                <tr key={c.id} className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                  <td className="px-3 py-2 text-[14px] text-gray-900 font-medium">{c.courseName}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-600 font-mono">{c.code}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{c.chapters}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-600">{c.department}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${c.courseType === "Elective" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-green-100 text-green-800 border-green-300"}`}>
                      {c.courseType || "Core"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center"><ActionButtons onEdit={() => handleEditCourse(c)} onDelete={() => handleDeleteCourse(c.id)} /></td>
                </tr>
              ))}
            </TableShell>
          )}

          {/* ── ROOMS ── */}
          {activeTab === "rooms" && (
            <TableShell
              label="Rooms"
              count={rooms.length}
              onAdd={() => setShowCreateModal(true)}
              addLabel="Add Room"
              headers={[
                { label: "ID" }, { label: "Room Name" }, { label: "Room Code" }, { label: "Actions", center: true },
              ]}
            >
              {rooms.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-[14px]">No rooms found.</td></tr>
              ) : rooms.map((r, idx, arr) => (
                <tr key={r.id} className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                  <td className="px-3 py-2 text-[12px] text-gray-500 font-mono">{r.id}</td>
                  <td className="px-3 py-2 text-[14px] text-gray-900 font-medium">{r.roomName}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-600 font-mono">{r.roomCode}</td>
                  <td className="px-3 py-2 text-center"><ActionButtons onEdit={() => handleEditRoom(r)} onDelete={() => handleDeleteRoom(r.id)} /></td>
                </tr>
              ))}
            </TableShell>
          )}

          {/* ── DEPARTMENTS ── */}
          {activeTab === "departments" && (
            <TableShell
              label="Departments"
              count={departments.length}
              onAdd={() => setShowCreateModal(true)}
              addLabel="Add Department"
              headers={[
                { label: "Department Name" }, { label: "Head of Department" }, { label: "Lecturers", center: true }, { label: "Actions", center: true },
              ]}
            >
              {departments.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-[14px]">No departments found.</td></tr>
              ) : departments.map((d, idx, arr) => (
                <tr key={d.id} className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                  <td className="px-3 py-2 text-[14px] text-gray-900 font-medium">{d.departmentName}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-600">{d.hod}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{d.numberOfLecturers}</td>
                  <td className="px-3 py-2 text-center"><ActionButtons onEdit={() => handleEditDepartment(d)} onDelete={() => handleDeleteDepartment(d.id)} /></td>
                </tr>
              ))}
            </TableShell>
          )}

          {/* ── GROUPS ── */}
          {activeTab === "groups" && (
            <TableShell
              label="Groups"
              count={groups.length}
              onAdd={() => setShowCreateModal(true)}
              addLabel="Add Group"
              headers={[
                { label: "Group Name" }, { label: "Code" }, { label: "Level", center: true }, { label: "Semester", center: true }, { label: "Actions", center: true },
              ]}
            >
              {groups.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-[14px]">No groups found.</td></tr>
              ) : groups.map((g, idx, arr) => (
                <tr key={g.id} className={`transition-colors hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                  <td className="px-3 py-2 text-[14px] text-gray-900 font-medium">{g.groupName}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-600 font-mono">{g.code}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{g.level}</td>
                  <td className="px-3 py-2 text-[13px] text-gray-700 text-center font-mono">{g.semester}</td>
                  <td className="px-3 py-2 text-center"><ActionButtons onEdit={() => handleEditGroup(g)} onDelete={() => handleDeleteGroup(g.id)} /></td>
                </tr>
              ))}
            </TableShell>
          )}
        </>
      )}

      {/* ── LECTURER MODAL ── */}
      {(showCreateModal || showEditModal) && activeTab === "lecturers" && (
        <Modal
          title={editingId ? "Edit Lecturer" : "Add Lecturer"}
          onClose={handleCloseLecturerModal}
          onSave={handleSaveLecturer}
          saveLabel={editingId ? "Update Lecturer" : "Save Lecturer"}
        >
          <div>
            <label className={labelCls}>Full name</label>
            <input type="text" value={newLecturerName} onChange={(e) => setNewLecturerName(e.target.value)}
              placeholder="e.g. Dr. Amara Nkosi" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Grade</label>
              <select value={newLecturerGrade} onChange={(e) => setNewLecturerGrade(e.target.value)} className={selectCls}>
                <option>Professor</option>
                <option>Associate Professor</option>
                <option>Assistant Professor</option>
                <option>Senior Lecturer</option>
                <option>Full Professor</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={newLecturerDepartment} onChange={(e) => setNewLecturerDepartment(e.target.value)} className={selectCls}>
                {departments.map((d) => <option key={d.id} value={d.departmentName}>{d.departmentName}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* ── COURSE MODAL ── */}
      {(showCreateModal || showEditModal) && activeTab === "courses" && (
        <Modal
          title={editingId ? "Edit Course" : "Add Course"}
          onClose={handleCloseCourseModal}
          onSave={handleSaveCourse}
          saveLabel={editingId ? "Update Course" : "Save Course"}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Course name</label>
              <input type="text" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="e.g. Data Structures" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Course code</label>
              <input type="text" value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)}
                placeholder="e.g. CS301" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Department</label>
              <select value={newCourseDepartment} onChange={(e) => setNewCourseDepartment(e.target.value)} className={selectCls}>
                {departments.map((d) => <option key={d.id} value={d.departmentName}>{d.departmentName}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Course type</label>
              <select value={newCourseType} onChange={(e) => setNewCourseType(e.target.value)} className={selectCls}>
                <option value="Core">Core</option>
                <option value="Elective">Elective</option>
              </select>
            </div>
          </div>
          {/* Chapters */}
          <div>
            <label className={labelCls}>Chapters</label>
            <div className="border border-gray-300 bg-gray-50 mb-2 min-h-[48px] px-3 py-2">
              {newCourseChapters.length === 0 ? (
                <p className="text-[12px] text-gray-400 italic">No chapters added yet.</p>
              ) : (
                <div className="space-y-1">
                  {newCourseChapters.map((ch, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-gray-700">
                        <span className="font-mono text-gray-400 mr-2">{idx + 1}.</span>{ch}
                      </span>
                      <button onClick={() => setNewCourseChapters(newCourseChapters.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-[11px] font-bold shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
                placeholder="Chapter title…"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={handleAddChapter}
                className="px-3 py-2 text-[13px] font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ROOM MODAL ── */}
      {(showCreateModal || showEditModal) && activeTab === "rooms" && (
        <Modal
          title={editingId ? "Edit Room" : "Add Room"}
          onClose={handleCloseRoomModal}
          onSave={handleSaveRoom}
          saveLabel={editingId ? "Update Room" : "Save Room"}
        >
          <div>
            <label className={labelCls}>Room name</label>
            <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. Room 101" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Room code</label>
            <input type="text" value={newRoomCode} onChange={(e) => setNewRoomCode(e.target.value)}
              placeholder="e.g. R101" className={inputCls} />
          </div>
        </Modal>
      )}

      {/* ── DEPARTMENT MODAL ── */}
      {(showCreateModal || showEditModal) && activeTab === "departments" && (
        <Modal
          title={editingId ? "Edit Department" : "Add Department"}
          onClose={handleCloseDepartmentModal}
          onSave={handleSaveDepartment}
          saveLabel={editingId ? "Update Department" : "Save Department"}
        >
          <div>
            <label className={labelCls}>Department name</label>
            <input type="text" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="e.g. Computer Science" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Head of department</label>
            <input type="text" value={newDepartmentHod} onChange={(e) => setNewDepartmentHod(e.target.value)}
              placeholder="e.g. Dr. John Smith" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Number of lecturers</label>
            <input type="number" value={newDepartmentLecturers} onChange={(e) => setNewDepartmentLecturers(e.target.value)}
              placeholder="e.g. 15" min={0} className={inputCls} />
          </div>
        </Modal>
      )}

      {/* ── GROUP MODAL ── */}
      {(showCreateModal || showEditModal) && activeTab === "groups" && (
        <Modal
          title={editingId ? "Edit Group" : "Add Group"}
          onClose={handleCloseGroupModal}
          onSave={handleSaveGroup}
          saveLabel={editingId ? "Update Group" : "Save Group"}
        >
          <div>
            <label className={labelCls}>Group name</label>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Group A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Group code</label>
            <input type="text" value={newGroupCode} onChange={(e) => setNewGroupCode(e.target.value)}
              placeholder="e.g. G001" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Level</label>
              <select value={newGroupLevel} onChange={(e) => setNewGroupLevel(e.target.value)} className={selectCls}>
                {["1", "2", "3", "4", "5"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select value={newGroupSemester} onChange={(e) => setNewGroupSemester(e.target.value)} className={selectCls}>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Integration;