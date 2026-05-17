import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Check, Download, FileText, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/utils/translations";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = "http://localhost:8080/api";

const safeJsonFetch = async <T,>(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  url: string,
  options: RequestInit = {}
): Promise<T | null> => {
  try {
    const res = await apiFetch(url, options);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

// Helper to convert LocalTime string "08:30:00" or "08:30" to minutes
const timeToMinutes = (time: string): number => {
  const parts = time.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
};

// Helper to format minutes -> "4h30" or "3h"
const formatMinutes = (totalMinutes: number): string => {
  if (!totalMinutes) return "0h";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
};

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
}

interface Chapter {
  id: number;
  chapterName: string;
  chapterNumber: number;
  courseId: number;
}

interface Room {
  id: number;
  roomName: string;
  roomCode: string;
}

interface DepartmentRow {
  id: number;
  departmentName: string;
}

interface Session {
  id: number;
  departmentId?: number | null;
  lecturer: {
    id: number;
    lecturerName: string;
    grade: string;
    department: string;
  };
  courseName: string;
  courseCode: string;
  semester: string;
  startTime: string;
  endTime: string;
  session_hours: number;
  groupCode: string;
  sessionType: string;
  chapters: number;
  sessionDate: string;
  lecturer_name: string;
  grade: string;
  department: string;
  course?: {
    id: number;
    courseName: string;
    code: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ToastMessage {
  title: string;
  description: string;
}

interface Group {
  id: number;
  code: string;
}

interface SessionTypeOption {
  value: string;
  label: string;
}

const sessionTypes: SessionTypeOption[] = [
  { value: "CM", label: "CM" },
  { value: "TD", label: "TD" },
  { value: "TP", label: "TP" },
];

const SessionPage = () => {
  const { language } = useLanguage();
  const { apiFetch, user } = useAuth();

  // View state
  const [activeView, setActiveView] = useState<"table" | "form">("table");
  const [pageMode, setPageMode] = useState<"registry" | "report">("registry");

  const [reportRows, setReportRows] = useState<Session[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  /** Empty = all lecturers */
  const [reportLecturerId, setReportLecturerId] = useState<string>("");
  /** Empty = all semesters */
  const [reportSemester, setReportSemester] = useState<string>("");

  // Table state
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({ title: "", description: "" });
  const [selectedDetailLecturer, setSelectedDetailLecturer] = useState<string>("");
  const [selectedDetailLecturerId, setSelectedDetailLecturerId] = useState<number | null>(null);
  const [selectedDetailSemester, setSelectedDetailSemester] = useState<string>("1");
  /** Used when the signed-in user has no `departmentId` on their profile (e.g. some non-HOD roles). */
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [sessionDepartmentId, setSessionDepartmentId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const effectiveSessionDepartmentId = useMemo(
    () => (user?.departmentId != null ? user.departmentId : sessionDepartmentId),
    [user?.departmentId, sessionDepartmentId]
  );

  // Form state
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<string>("");
  const [selectedLecturerId, setSelectedLecturerId] = useState<number | null>(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [program, setProgram] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>("");
  const [sessionType, setSessionType] = useState<string>("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [topicCovered, setTopicCovered] = useState<string>("");

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [lectData, sessData, groupData, courseData, roomData, chapData, deptData] = await Promise.all([
          safeJsonFetch<Lecturer[] | Lecturer>(apiFetch, `${API_BASE_URL}/lecturers`),
          safeJsonFetch<Session[] | Session>(apiFetch, `${API_BASE_URL}/sessions`),
          safeJsonFetch<Group[] | Group>(apiFetch, `${API_BASE_URL}/groups`),
          safeJsonFetch<Course[] | Course>(apiFetch, `${API_BASE_URL}/courses`),
          safeJsonFetch<Room[] | Room>(apiFetch, `${API_BASE_URL}/rooms`),
          safeJsonFetch<Chapter[] | Chapter>(apiFetch, `${API_BASE_URL}/chapters`),
          safeJsonFetch<DepartmentRow[] | DepartmentRow>(apiFetch, `${API_BASE_URL}/departments`),
        ]);

        if (lectData) setLecturers(Array.isArray(lectData) ? lectData : [lectData]);
        else setLecturers([]);

        if (sessData) setSessions(Array.isArray(sessData) ? sessData : [sessData]);
        else setSessions([]);

        if (groupData) setGroups(Array.isArray(groupData) ? groupData : [groupData]);
        if (courseData) setCoursesList(Array.isArray(courseData) ? courseData : [courseData]);
        if (roomData) setRoomsList(Array.isArray(roomData) ? roomData : [roomData]);
        if (chapData) setChaptersList(Array.isArray(chapData) ? chapData : [chapData]);
        if (deptData) setDepartments(Array.isArray(deptData) ? deptData : [deptData]);
        else setDepartments([]);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLecturers([]);
        setSessions([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [apiFetch]);

  useEffect(() => {
    if (user?.departmentId != null) return;
    if (sessionDepartmentId != null) return;
    if (departments.length === 0) return;
    setSessionDepartmentId(departments[0].id);
  }, [user?.departmentId, sessionDepartmentId, departments]);

  const loadReportFromApi = useCallback(async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportLecturerId) params.append("lecturerId", reportLecturerId);
      if (reportSemester) params.append("semester", reportSemester);
      if (effectiveSessionDepartmentId != null) {
        params.append("departmentId", String(effectiveSessionDepartmentId));
      }
      const qs = params.toString();
      const rows = await safeJsonFetch<Session[]>(
        apiFetch,
        `${API_BASE_URL}/sessions/report${qs ? `?${qs}` : ""}`
      );
      setReportRows(rows && Array.isArray(rows) ? rows : []);
    } finally {
      setReportLoading(false);
    }
  }, [reportLecturerId, reportSemester, apiFetch, effectiveSessionDepartmentId]);

  useEffect(() => {
    if (activeView !== "table" || pageMode !== "report") return;
    void loadReportFromApi();
  }, [activeView, pageMode, loadReportFromApi]);

  const exportReportCsv = async (): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (reportLecturerId) params.append("lecturerId", reportLecturerId);
      if (reportSemester) params.append("semester", reportSemester);
      if (effectiveSessionDepartmentId != null) {
        params.append("departmentId", String(effectiveSessionDepartmentId));
      }
      const qs = params.toString();
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/sessions/report/export${qs ? `?${qs}` : ""}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        showToastMsg({ title: "Export failed", description: "Could not download the report." });
        return;
      }
      const blob = await res.blob();
      const lecPart = reportLecturerId || "all";
      const semPart = reportSemester || "all";
      const nameSafe = `academic-session-report-${semPart}-${lecPart}-${new Date().toISOString().slice(0, 10)}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${nameSafe}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      showToastMsg({ title: "Export failed", description: "Network error." });
    }
  };

  // Fetch chapters when course changes
  useEffect(() => {
    if (selectedCourseId) {
      safeJsonFetch<Chapter[] | Chapter>(apiFetch, `${API_BASE_URL}/chapters/course/${selectedCourseId}`)
        .then((data) => setChaptersList(data ? (Array.isArray(data) ? data : [data]) : []));
    } else {
      setChaptersList([]);
    }
  }, [selectedCourseId, apiFetch]);

  // Helpers
  const getLecturerName = (session: Session): string => {
    if (session.lecturer?.lecturerName) return session.lecturer.lecturerName;
    if (session.lecturer_name) return session.lecturer_name;
    return "Unknown Lecturer";
  };

  const handleCourseChange = (courseName: string): void => {
    const selected = coursesList.find(c => c.courseName === courseName);
    if (selected) {
      setSelectedCourseTitle(selected.courseName);
      setSelectedCourseId(selected.id);
    } else {
      setSelectedCourseTitle("");
      setSelectedCourseId(null);
    }
    setSelectedChapters([]);
  };

  const toggleGroup = (group: string): void => {
    setSelectedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const toggleChapter = (chapter: string): void => {
    setSelectedChapters(prev =>
      prev.includes(chapter) ? prev.filter(c => c !== chapter) : [...prev, chapter]
    );
  };

  const resetForm = (): void => {
    setSelectedLecturer("");
    setSelectedLecturerId(null);
    setSelectedCourseTitle("");
    setSelectedCourseId(null);
    setProgram("");
    setSessionDate("");
    setSessionType("");
    setSelectedGroups([]);
    setSelectedRoom("");
    setStartTime("");
    setEndTime("");
    setSelectedChapters([]);
    setTopicCovered("");
  };

  const calculateDuration = (): string => {
    if (!startTime || !endTime) return "";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const diffMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (diffMinutes <= 0) return "";
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  const showToastMsg = (msg: ToastMessage): void => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = (): void => {
    if (!selectedCourseId || !sessionDate || !sessionType || !startTime || !endTime || !selectedLecturerId || !program) {
      showToastMsg({ title: "Incomplete Form", description: "Please fill all required fields" });
      return;
    }
    if (user?.backendRole !== "HOD" && effectiveSessionDepartmentId == null) {
      showToastMsg({
        title: "Incomplete Form",
        description: "A department is required. Select one or ensure your account has a department.",
      });
      return;
    }

    const newSession: Record<string, unknown> = {
      lecturerId: selectedLecturerId,
      courseId: selectedCourseId,
      semester: program,
      startTime,
      endTime,
      groupCode: selectedGroups.length > 0 ? selectedGroups.join(", ") : "",
      sessionType,
      chapters: selectedChapters.length,
      sessionDate,
    };
    if (effectiveSessionDepartmentId != null) {
      newSession.departmentId = effectiveSessionDepartmentId;
    }

    apiFetch(`${API_BASE_URL}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSession),
    })
      .then(res => {
        if (res.ok) {
          showToastMsg({ title: "Success", description: `Session created for ${selectedCourseTitle}` });
          resetForm();
          setActiveView("table");
          safeJsonFetch<Session[] | Session>(apiFetch, `${API_BASE_URL}/sessions`)
            .then((data) => {
              if (data) setSessions(Array.isArray(data) ? data : [data]);
            });
        } else {
          return res.json().then(err => {
            throw new Error(err.message || err.error || "Failed to create session");
          });
        }
      })
      .catch(err => {
        showToastMsg({ title: "Error", description: err.message || "Failed to create session" });
      });
  };

  const handleClassify = async () => {
    if (!selectedDetailLecturer || !selectedDetailLecturerId) {
      showToastMsg({ title: "Error", description: "Please select a lecturer first" });
      return;
    }

    const filteredSessions = sessions.filter(s =>
      s.lecturer?.lecturerName === selectedDetailLecturer &&
      s.semester === selectedDetailSemester
    );

    if (filteredSessions.length === 0) {
      showToastMsg({ title: "Error", description: "No sessions found for this lecturer and semester" });
      return;
    }

    const cmMinutesTotal = filteredSessions
      .filter(s => s.sessionType === "CM")
      .reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0);

    const tdMinutesTotal = filteredSessions
      .filter(s => s.sessionType === "TD")
      .reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0);

    const tpMinutesTotal = filteredSessions
      .filter(s => s.sessionType === "TP")
      .reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0);

    const courseIds = [...new Set(
      filteredSessions
        .map(s => s.course?.id)
        .filter((id): id is number => id != null)
    )].join(",");

    const groupCodes = [...new Set(filteredSessions.map(s => s.groupCode).filter(Boolean))].join(",");

    const groupIds = [...new Set(
      filteredSessions
        .map(s => s.groupCode)
        .filter(Boolean)
        .map(code => groups.find(g => g.code === code)?.id)
        .filter((id): id is number => id != null)
    )].join(",");

    const sessionIds = filteredSessions.map(s => s.id).join(",");

    if (!courseIds) {
      showToastMsg({ title: "Error", description: "Could not resolve course IDs from sessions" });
      return;
    }

    if (!groupIds) {
      showToastMsg({ title: "Error", description: `Could not resolve group IDs for codes: ${groupCodes}` });
      return;
    }

    if (effectiveSessionDepartmentId == null) {
      showToastMsg({ title: "Error", description: "Select a department before classifying." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/classifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturerId: selectedDetailLecturerId,
          semester: selectedDetailSemester,
          courseIds,
          groupIds,
          departmentId: effectiveSessionDepartmentId,
          cmHour: cmMinutesTotal,
          tdHour: tdMinutesTotal,
          tpHour: tpMinutesTotal,
          sessionIds,
        }),
      });

      if (response.ok) {
        showToastMsg({
          title: "Success",
          description: `Classified: CM=${formatMinutes(cmMinutesTotal)}, TD=${formatMinutes(tdMinutesTotal)}, TP=${formatMinutes(tpMinutesTotal)}`,
        });
      } else {
        const error = await response.json();
        showToastMsg({ title: "Error", description: error.error || "Failed to classify" });
      }
    } catch (err) {
      showToastMsg({ title: "Error", description: "Failed to classify" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {showToast && (
        <div className="fixed top-4 right-4 bg-white border border-gray-300 shadow-xl p-4 z-50">
          <div className="font-semibold text-sm text-gray-800">{toastMessage.title}</div>
          <div className="text-[12px] text-gray-600">{toastMessage.description}</div>
        </div>
      )}

      {/* ─── TABLE VIEW ─────────────────────────────────────────────── */}
      {activeView === "table" && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-gray-300 pb-3 mt-2">
            <button
              type="button"
              onClick={() => setPageMode("registry")}
              className={`px-4 py-2 text-sm font-semibold border transition-colors ${
                pageMode === "registry"
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Session registry
            </button>
            <button
              type="button"
              onClick={() => setPageMode("report")}
              className={`px-4 py-2 text-sm font-semibold border transition-colors ${
                pageMode === "report"
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Academic session report
            </button>
          </div>

          {user?.backendRole !== "HOD" && user?.departmentId == null && departments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-gray-800">
              <span className="font-medium text-gray-700">Department scope</span>
              <select
                value={sessionDepartmentId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSessionDepartmentId(v ? Number(v) : null);
                }}
                className="border border-gray-300 px-2 py-1.5 bg-white min-w-[220px] text-gray-900"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {pageMode === "report" && (
            <div className="space-y-4 mt-6">
              <p className="text-sm text-gray-600">
                Load teaching sessions from the database, filter by lecturer and semester, then export as CSV for Excel
                or other tools.
              </p>
              <div className="flex flex-wrap gap-4 items-end bg-gray-50 border border-gray-300 p-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">Lecturer</label>
                  <select
                    value={reportLecturerId}
                    onChange={(e) => setReportLecturerId(e.target.value)}
                    className="min-w-[220px] px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    disabled={loadingData}
                  >
                    <option value="">All lecturers</option>
                    {lecturers.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.lecturerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={reportSemester}
                    onChange={(e) => setReportSemester(e.target.value)}
                    className="min-w-[180px] px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                  >
                    <option value="">All semesters</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void loadReportFromApi()}
                  disabled={reportLoading}
                  className="px-4 py-2 text-sm font-semibold border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                >
                  {reportLoading ? "Loading…" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => void exportReportCsv()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 text-white border border-gray-700 hover:bg-gray-800"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Export CSV
                </button>
              </div>

              <div className="bg-white overflow-x-auto border border-gray-300">
                <table className="w-full">
                  <thead className="bg-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Lecturer</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Course</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Semester</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Start</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">End</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Hours</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Group</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Type</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Chapters</th>
                      <th className="px-3 py-2 text-left text-[13px] font-medium text-white">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {reportRows.length === 0 && !reportLoading ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-500">
                          No sessions for these filters — choose another lecturer or semester, or click Refresh after
                          adding sessions.
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((session, idx, arr) => (
                        <tr
                          key={session.id}
                          className={`hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}
                        >
                          <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">
                            {getLecturerName(session)}
                          </td>
                          <td className="px-3 py-2 text-[13px] text-gray-900">{session.courseName}</td>
                          <td className="px-3 py-2 text-[13px] text-gray-900 text-center">{session.semester}</td>
                          <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.startTime}</td>
                          <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.endTime}</td>
                          <td className="px-3 py-2 text-[13px] font-semibold text-gray-900 text-center">
                            {formatMinutes(timeToMinutes(session.endTime) - timeToMinutes(session.startTime))}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 text-[11px] font-medium border border-gray-200">
                              {session.groupCode}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 text-[11px] font-medium border border-gray-200">
                              {session.sessionType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[13px] text-gray-900 text-center">{session.chapters}</td>
                          <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.sessionDate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!reportLoading && reportRows.length > 0 ? (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-[12px] text-gray-700">
                    Showing <strong>{reportRows.length}</strong> session(s) from database
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {pageMode === "registry" && (
            <>
          {/* Filter Bar */}
          <div className="bg-gray-50 border border-gray-300 mt-8">
            <div className="px-6 py-2 flex items-center justify-between border-b border-gray-300">
              <div className="flex items-center gap-4">
                <label className="text-[14px] font-semibold text-gray-900">Lecturer:</label>
                <select
                  value={selectedDetailLecturer}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedDetailLecturer(name);
                    const lec = lecturers.find(l => l.lecturerName === name);
                    setSelectedDetailLecturerId(lec ? lec.id : null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded text-[14px] text-gray-900 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <option value="">All Lecturers</option>
                  {lecturers.map(l => (
                    <option key={l.id} value={l.lecturerName}>{l.lecturerName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDetailSemester("1")}
                  className={`px-4 py-2 text-[12px] font-semibold border transition-colors ${
                    selectedDetailSemester === "1"
                      ? "bg-gray-300 text-gray-900 border-gray-400"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  SEMESTER 1
                </button>
                <button
                  onClick={() => setSelectedDetailSemester("2")}
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
            <div className="h-1.5 bg-gray-800"></div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white overflow-x-auto border border-gray-300">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Lecturer</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Course</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Semester</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Start</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">End</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Hours</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Group</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Type</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Chapters</th>
                  <th className="px-3 py-2 text-left text-[14px] font-medium text-white whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {sessions
                  .filter(s => {
                    const matchLecturer = !selectedDetailLecturer || s.lecturer?.lecturerName === selectedDetailLecturer;
                    const matchSemester = !selectedDetailSemester || s.semester === selectedDetailSemester;
                    return matchLecturer && matchSemester;
                  })
                  .map((session, idx, arr) => (
                    <tr
                      key={session.id}
                      className={`hover:bg-gray-50 transition-colors ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}
                    >
                      <td className="px-3 py-2 text-[14px] text-gray-900 whitespace-nowrap">{getLecturerName(session)}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900">{session.courseName}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 text-center">{session.semester}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 whitespace-nowrap">{session.startTime}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 whitespace-nowrap">{session.endTime}</td>
                      <td className="px-3 py-2 text-[14px] font-semibold text-gray-900 text-center">
                        {formatMinutes(timeToMinutes(session.endTime) - timeToMinutes(session.startTime))}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[12px] font-medium border border-gray-200 whitespace-nowrap">
                          {session.groupCode}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[12px] font-medium border border-gray-200 whitespace-nowrap">
                          {session.sessionType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 text-center">{session.chapters}</td>
                      <td className="px-3 py-2 text-[14px] text-gray-900 whitespace-nowrap">{session.sessionDate}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[12px] text-gray-600 px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
              <p className="font-semibold text-gray-800 text-[13px]">
                Total Courses:{" "}
                <span className="text-[14px] font-bold text-gray-900">
                  {new Set(sessions
                    .filter(s =>
                      (!selectedDetailLecturer || s.lecturer?.lecturerName === selectedDetailLecturer) &&
                      (!selectedDetailSemester || s.semester === selectedDetailSemester)
                    )
                    .map(s => s.courseName)
                  ).size}
                </span>{" "}
                | Total Hours:{" "}
                <span className="text-[14px] font-bold text-gray-900">
                  {formatMinutes(sessions
                    .filter(s =>
                      (!selectedDetailLecturer || s.lecturer?.lecturerName === selectedDetailLecturer) &&
                      (!selectedDetailSemester || s.semester === selectedDetailSemester)
                    )
                    .reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0)
                  )}
                </span>{" "}
                | Total:{" "}
                <span className="text-[14px] font-bold text-gray-900">
                  {sessions.filter(s =>
                    (!selectedDetailLecturer || s.lecturer?.lecturerName === selectedDetailLecturer) &&
                    (!selectedDetailSemester || s.semester === selectedDetailSemester)
                  ).length}
                </span>{" "}
                session(s)
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClassify}
                  disabled={!selectedDetailLecturer || isSubmitting}
                  className="border border-gray-400 text-gray-700 hover:bg-gray-50 px-8 py-2.5 text-[14px] font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Check size={14} />
                  {isSubmitting ? "Classifying..." : "Classify"}
                </button>
                <button
                  onClick={() => setActiveView("form")}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-8 py-2.5 font-semibold text-[14px] transition-colors shadow-md flex items-center gap-2"
                >
                  <FileText size={14} />
                  New Session
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              {t(language, "teachingManagementSystem")}
            </p>
          </div>
            </>
          )}
        </>
      )}

      {/* ─── FORM VIEW ──────────────────────────────────────────────── */}
      {activeView === "form" && (
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => { setActiveView("table"); resetForm(); }}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-[14px] font-medium">Back</span>
          </button>

          {/* Form Card */}
          <div className="bg-white overflow-hidden border border-gray-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 border-b border-gray-300">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2.5 shadow-sm">
                  <FileText className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Class Record</h2>
                  <p className="text-gray-300 text-[12px]">Teaching Session Declaration Form</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Lecturer */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "lecturer")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedLecturerId || ""}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      const lec = lecturers.find(l => l.id === id);
                      setSelectedLecturerId(id || null);
                      setSelectedLecturer(lec?.lecturerName || "");
                    }}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                    disabled={loadingData}
                  >
                    <option value="">{loadingData ? "Loading..." : t(language, "selectLecturer")}</option>
                    {lecturers.map(l => (
                      <option key={l.id} value={l.id}>{l.lecturerName}</option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "course")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourseTitle}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                    disabled={loadingData}
                  >
                    <option value="">{loadingData ? "Loading..." : t(language, "selectCourse")}</option>
                    {coursesList.map(c => (
                      <option key={c.id} value={c.courseName}>{c.courseName}</option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                  >
                    <option value="">Select semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>

                {/* Session Date */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "sessionDate")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                  />
                </div>

                {/* Room */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "room")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                    disabled={loadingData}
                  >
                    <option value="">{loadingData ? "Loading..." : "Select room"}</option>
                    {roomsList.map(r => (
                      <option key={r.id} value={r.roomCode}>{r.roomCode} - {r.roomName}</option>
                    ))}
                  </select>
                </div>

                {/* Session Type */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "sessionType")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 pt-1">
                    {sessionTypes.map(type => (
                      <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sessionType"
                          value={type.value}
                          checked={sessionType === type.value}
                          onChange={() => setSessionType(type.value)}
                          className="w-4 h-4 text-gray-700"
                        />
                        <span className="text-[14px] text-gray-700 font-medium">{type.value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Slot */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "startTime")} / {t(language, "endTime")} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                    />
                  </div>
                  {calculateDuration() && (
                    <p className="text-[11px] text-gray-600 mt-2 font-medium">
                      {t(language, "duration")}: <span className="text-gray-800">{calculateDuration()}</span>
                    </p>
                  )}
                </div>

                {/* Groups */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "groups")}
                  </label>
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) toggleGroup(e.target.value); }}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm"
                    disabled={loadingData}
                  >
                    <option value="">{loadingData ? "Loading..." : t(language, "selectGroups")}</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.code}>{g.code}</option>
                    ))}
                  </select>
                  {selectedGroups.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedGroups.map(group => (
                        <div key={group} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1 text-[12px] font-medium border border-gray-300">
                          {group}
                          <button onClick={() => setSelectedGroups(prev => prev.filter(g => g !== group))}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chapters */}
                <div>
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "chapters")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) toggleChapter(e.target.value); }}
                    className="w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 text-[14px] shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={!selectedCourseId || loadingData}
                  >
                    <option value="">
                      {!selectedCourseId ? "Select a course first" : loadingData ? "Loading..." : t(language, "selectChapters")}
                    </option>
                    {chaptersList.map(ch => (
                      <option key={ch.id} value={ch.chapterName}>{ch.chapterName}</option>
                    ))}
                  </select>
                  {selectedChapters.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedChapters.map(ch => (
                        <div key={ch} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1 text-[12px] font-medium border border-gray-300">
                          {ch}
                          <button onClick={() => setSelectedChapters(prev => prev.filter(c => c !== ch))}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Topic Covered */}
                <div className="md:col-span-2">
                  <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                    {t(language, "topicCovered")} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={topicCovered}
                    onChange={(e) => setTopicCovered(e.target.value)}
                    placeholder="Describe the topics covered, activities conducted, and any additional notes about this teaching session..."
                    rows={4}
                    className="w-full border border-gray-300 px-3 py-2.5 text-gray-900 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-sm resize-none"
                  />
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-gray-200">
              <button
                onClick={() => { setActiveView("table"); resetForm(); }}
                className="border border-gray-400 text-gray-700 hover:bg-gray-50 px-8 py-2.5 text-[14px] font-semibold transition-colors shadow-sm"
              >
                {t(language, "saveDraft")}
              </button>
              <button
                onClick={handleSubmit}
                className="bg-gray-700 hover:bg-gray-800 text-white px-8 py-2.5 font-semibold text-[14px] transition-colors shadow-md"
              >
                {t(language, "submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionPage;