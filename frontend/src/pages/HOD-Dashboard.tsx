import { useState, useMemo, useEffect } from "react";
import { FileText, X, ArrowLeft, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/utils/translations";

const API_BASE_URL = "http://localhost:8080/api";

const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(url, { ...options, headers });
};

const safeJsonFetch = async <T,>(url: string, options: RequestInit = {}): Promise<T | null> => {
  try {
    const response = await authFetch(url, options);
    if (!response.ok) {
      console.error(`Request failed (${response.status}) for ${url}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Network failure for ${url}:`, error);
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

interface Course {
  id: number;
  courseName: string;
  code: string;
  chapters: number;
  department: string;
}

interface SessionType {
  value: string;
  label: string;
}

interface ToastMessage {
  title: string;
  description: string;
}

interface Session {
  id: number;
  courseName: string;
  courseCode: string;
  lecturerName: string;
  grade: string;
  department: string;
  startTime: string;
  endTime: string;
  sessionHour: number;
  groupCode: string;
  sessionType: string;
  chapters: number;
  sessionDate: string;
  semester: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ValidationStatus = "pending" | "validated" | "returned";

export interface ScheduleEntry {
  id: string;
  date: string;
  courseCode: string;
  courseTitle: string;
  lecturer: string;
  semester?: string;
  sessionType: string;
  groups: string;
  startTime: string;
  endTime: string;
  status: ValidationStatus;
}

interface Lecturer {
  id: number;
  lecturerName: string;
}

interface Chapter {
  id: number;
  chapterName: string;
  chapterNumber: number;
  courseId: number;
}

interface Group {
  id: number;
  code: string;
}

interface Room {
  id: number;
  roomName: string;
  roomCode: string;
}

interface Classification {
  id: number;
  lecturer: {
    id: number;
    lecturerName: string;
    grade: string;
  };
  courseIds: string;
  groupIds: string;
  sessionIds: string; // "1,2,3"
  semester: string;
  cmHour: number;
  tdHour: number;
  tpHour: number;
  classifiedStatus: "PENDING" | "VALIDATED" | "RETURNED";
  createdAt: string;
  updatedAt?: string;
}

const programs: string[] = [
  "Bachelor Year 1 - Semester 1",
  "Bachelor Year 1 - Semester 2",
  "Bachelor Year 2 - Semester 1",
  "Bachelor Year 2 - Semester 2",
  "Bachelor Year 3 - Semester 1",
  "Bachelor Year 3 - Semester 2",
  "Master Year 1 - Semester 1",
  "Master Year 1 - Semester 2",
];

const sessionTypes: SessionType[] = [
  { value: "CM", label: "CM" },
  { value: "TD", label: "TD" },
  { value: "TP", label: "TP" },
];

// Data interface for classified detail view
interface ClassifiedTableRow {
  course: string;
  start: string;
  end: string;
  hours: number;
  group: string;
  type: string;
  chapter: string;
  date: string;
  id: number;
}

const StatusBadge = ({ status, language }: { status: ValidationStatus; language: "english" | "arabic" }) => {
  const statusStyles = {
    pending: "bg-blue-50 text-blue-700 border-blue-200",
    validated: "bg-green-50 text-green-700 border-green-200",
    returned: "bg-orange-50 text-orange-700 border-orange-200",
  };

  const statusLabels: Record<ValidationStatus, string> = {
    pending: language === "english" ? "Pending" : "قيد الانتظار",
    validated: language === "english" ? "Validated" : "تم التحقق",
    returned: language === "english" ? "Returned" : "تم إرجاعه",
  };

  return (
    <span
      className={`flex items-center justify-center w-32 px-3 py-1.5 text-[12px] font-medium border ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
};

const ClassificationBlock = ({
  classification,
  totalHours,
  statusColor,
  sessionIds,
  onDelete,
}: {
  classification: Classification;
  totalHours: number;
  statusColor: string;
  sessionIds: string[];
  onDelete: (id: number) => void;
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionIds.length === 0) { setLoading(false); return; }
    Promise.all(
      sessionIds.map(id =>
        authFetch(`${API_BASE_URL}/sessions/${id}`).then(r => r.ok ? r.json() : null)
      )
    )
      .then(results => setSessions(results.filter(Boolean)))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [classification.id]);

  return (
    <div className="border border-gray-300">
      {/* Summary header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-6 text-[14px] text-gray-800">
          <span className="font-semibold">{classification.lecturer.lecturerName}</span>
          <span className="text-gray-500">Sem {classification.semester}</span>
          <span>CM: {formatMinutes(classification.cmHour)}</span>
          <span>TD: {formatMinutes(classification.tdHour)}</span>
          <span>TP: {formatMinutes(classification.tpHour)}</span>
          <span className="font-semibold">Total: {formatMinutes(totalHours)}</span>
        </div>
        <span className={`px-3 py-1 text-[12px] font-medium border ${statusColor}`}>
          {classification.classifiedStatus.charAt(0) + classification.classifiedStatus.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Sessions table */}
      {loading ? (
        <div className="px-6 py-4 text-[14px] text-gray-500">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="px-6 py-4 text-[14px] text-gray-500">No sessions found.</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              {["Lecturer","Course","Semester","Start","End","Hours","Group","Type","Chapters","Date"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[13px] font-medium text-white whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {sessions.map((session, idx, arr) => (
              <tr key={session.id} className={`hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.lecturerName}</td>
                <td className="px-3 py-2 text-[13px] text-gray-900">{session.courseName}</td>
                <td className="px-3 py-2 text-[13px] text-gray-900 text-center">{session.semester}</td>
                <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.startTime}</td>
                <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.endTime}</td>
                <td className="px-3 py-2 text-[13px] font-semibold text-gray-900 text-center">
                  {formatMinutes(timeToMinutes(session.endTime) - timeToMinutes(session.startTime))}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[12px] font-medium border border-gray-200 whitespace-nowrap">
                    {session.groupCode}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[12px] font-medium border border-gray-200">
                    {session.sessionType}
                  </span>
                </td>
                <td className="px-3 py-2 text-[13px] text-gray-900 text-center">{session.chapters}</td>
                <td className="px-3 py-2 text-[13px] text-gray-900 whitespace-nowrap">{session.sessionDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      {!loading && sessions.length > 0 && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-[12px] text-gray-600">
          <p className="font-semibold text-gray-800">
            {sessions.length} session(s) | Total:{" "}
            <span className="text-gray-900 font-bold">
              {formatMinutes(sessions.reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0))}
            </span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => onDelete(classification.id)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 text-[13px] font-semibold flex items-center gap-2">
              <X size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ScheduleTable = ({ entries, language, onClassifiedClick }: { entries: ScheduleEntry[]; language: "english" | "arabic"; onClassifiedClick?: (lecturer: string, semester?: string) => void }) => {
  // navigation handled via sidebar event dispatch
  const stats = {
    validated: entries.filter((c) => c.status === "validated").length,
    pending: entries.filter((c) => c.status === "pending").length,
    returned: entries.filter((c) => c.status === "returned").length,
  };

  const courseCounts: Record<string, number> = entries.reduce((acc, e) => {
    const key = e.lecturer || "";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Static total hours per lecturer (semester totals), shown as examples (all > 120H)
  const lecturerTotals: Record<string, number> = {
    "Dr. Sarah Mitchell": 340,
    "Prof. John Anderson": 180,
    "Dr. Emily Chen": 152,
    "Prof. Michael Johnson": 200,
    "Dr. Lisa Rodriguez": 130,
    "Prof. James Williams": 140,
  };

  return (
    <div className="bg-white overflow-hidden border border-gray-300">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#4a5568" }}>
                Date
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#3a4a5c" }}>
                Semester
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#4a5568" }}>
                Lecturers
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#3a4a5c" }}>
                Grade
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#4a5568" }}>
                Groupe(s)
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#3a4a5c" }}>
                Courses
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#4a5568" }}>
                Total
              </th>
              <th className="px-6 py-2 text-left text-[14px] font-medium text-white" style={{ backgroundColor: "#3a4a5c" }}>
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {entries.map((entry, index) => (
              <tr 
                key={entry.id} 
                onClick={() => {
                  onClassifiedClick?.(entry.lecturer, entry.semester);
                }}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  index !== entries.length - 1 ? 'border-b border-gray-200' : ''
                }`}
              >
                <td className="px-6 py-2 whitespace-nowrap text-[14px] text-gray-900">
                  {entry.date}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-[14px] font-medium text-gray-900">
                  {entry.semester || entry.courseCode}
                </td>
                <td className="px-6 py-2 text-[14px] text-gray-900">
                  {entry.lecturer}
                </td>
                <td className="px-6 py-2 text-[14px] text-gray-900">
                  {entry.sessionType}
                </td>
                <td className="px-6 py-2 text-[14px] text-gray-700">
                  {entry.groups}
                </td>
                <td className="px-6 py-2 text-[14px] text-gray-900">
                  {entry.startTime}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-[14px] font-semibold text-gray-900">
                  {entry.endTime}
                </td>
                <td className="px-6 py-2 whitespace-nowrap">
                  <StatusBadge status={entry.status} language={language} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-medium text-[13px] text-gray-900">{entry.courseCode}</div>
                <div className="text-[12px] text-gray-600 mt-0.5">{entry.date}</div>
              </div>
              <StatusBadge status={entry.status} language={language} />
            </div>
            
            <div className="text-[13px] text-gray-900 mb-2 font-medium">
              {entry.lecturer}
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[14px] font-medium border border-gray-200">
                {entry.sessionType}
              </span>
              <span className="inline-block bg-gray-50 text-gray-600 px-3 py-1 text-[14px] border border-gray-200">
                {entry.groups}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-[12px] text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium">Courses:</span>
                <span className="font-mono text-gray-900">{courseCounts[entry.lecturer] || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Total:</span>
                <span className="font-mono text-gray-900">{`${lecturerTotals[entry.lecturer] || 0}H`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[12px] text-gray-600 px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p>{t(language, "total")}: {entries.length}</p>
        <p>
          {t(language, "validated")}: {stats.validated} | {t(language, "submitted")}: {stats.pending} | {t(language, "returned")}: {stats.returned}
        </p>
      </div>
    </div>
  );
};

const HODDashboard = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"form" | "validation" | "classifiedDetail">("validation");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDetailLecturer, setSelectedDetailLecturer] = useState<string>("");
  const [selectedDetailSemester, setSelectedDetailSemester] = useState<string>("1");
  const [selectedDetailCourse, setSelectedDetailCourse] = useState<string>("");
  const [selectedLecturer, setSelectedLecturer] = useState<string>("");
  const [selectedLecturerId, setSelectedLecturerId] = useState<number | null>(null);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>("");
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>("");
  const [program, setProgram] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>("");
  const [sessionType, setSessionType] = useState<string>("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [topicCovered, setTopicCovered] = useState<string>("");
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({ title: "", description: "" });
  const [lecturerFilter, setLecturerFilter] = useState<string>("");
  const [semesterFilter, setSemesterFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [teachingGroups, setTeachingGroups] = useState<Group[]>([]);
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [selectedClassificationId, setSelectedClassificationId] = useState<number | null>(null);
  const [classificationSessions, setClassificationSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Fetch all dropdown data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [lectData, courseData, groupData, roomData, chapData] = await Promise.all([
          safeJsonFetch<Lecturer[] | Lecturer>(`${API_BASE_URL}/lecturers`),
          safeJsonFetch<any[] | any>(`${API_BASE_URL}/courses`),
          safeJsonFetch<Group[] | Group>(`${API_BASE_URL}/groups`),
          safeJsonFetch<Room[] | Room>(`${API_BASE_URL}/rooms`),
          safeJsonFetch<Chapter[] | Chapter>(`${API_BASE_URL}/chapters`),
        ]);

        if (lectData) {
          setLecturers(Array.isArray(lectData) ? lectData : [lectData]);
        }
        if (courseData) {
          setCoursesList(Array.isArray(courseData) ? courseData : [courseData]);
        }
        if (groupData) {
          setTeachingGroups(Array.isArray(groupData) ? groupData : [groupData]);
        }
        if (roomData) {
          setRoomsList(Array.isArray(roomData) ? roomData : [roomData]);
        }
        if (chapData) {
          setChaptersList(Array.isArray(chapData) ? chapData : [chapData]);
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Fetch chapters for selected course
  useEffect(() => {
    if (selectedCourseId) {
      const fetchCourseChapters = async () => {
        try {
          const data = await safeJsonFetch<Chapter[] | Chapter>(`${API_BASE_URL}/chapters/course/${selectedCourseId}`);
          if (data) {
            setChaptersList(Array.isArray(data) ? data : [data]);
          }
        } catch (error) {
          console.error("Error fetching chapters for course:", error);
        }
      };
      fetchCourseChapters();
    } else {
      setChaptersList([]);
    }
  }, [selectedCourseId]);

  // Fetch sessions from backend
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await safeJsonFetch<Session[]>(`${API_BASE_URL}/sessions`);
        if (data) {
          setSessions(data);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Fetch classifications from backend
  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const data = await safeJsonFetch<Classification[] | Classification>(`${API_BASE_URL}/classifications`);
        if (data) {
          setClassifications(Array.isArray(data) ? data : [data]);
        }
      } catch (error) {
        console.error("Error fetching classifications:", error);
      }
    };
    fetchClassifications();
  }, []);

  // Fetch sessions for a specific classification
  const fetchSessionsForClassification = async (classification: Classification) => {
    if (!classification.sessionIds) {
      setClassificationSessions([]);
      return;
    }
    const ids = classification.sessionIds.split(",").map(id => id.trim()).filter(Boolean);
    setLoadingSessions(true);
    try {
      const results = await Promise.all(
        ids.map(id => authFetch(`${API_BASE_URL}/sessions/${id}`).then(r => r.ok ? r.json() : null))
      );
      setClassificationSessions(results.filter(Boolean));
    } catch (e) {
      console.error("Failed to fetch sessions for classification", e);
      setClassificationSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCourseChange = (courseName: string): void => {
    // Find the course by name to get its details
    const selectedCourse = coursesList.find(c => c.courseName === courseName);
    if (selectedCourse) {
      setSelectedCourseCode(selectedCourse.code);
      setSelectedCourseTitle(selectedCourse.courseName);
      setSelectedCourseId(selectedCourse.id);
    } else {
      setSelectedCourseCode("");
      setSelectedCourseTitle("");
      setSelectedCourseId(null);
    }
    // Clear selected chapters when course changes
    setSelectedChapters([]);
  };

  const toggleGroup = (group: string): void => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const removeGroup = (group: string): void => {
    setSelectedGroups((prev) => prev.filter((g) => g !== group));
  };

  const toggleChapter = (chapter: string): void => {
    setSelectedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter]
    );
  };

  const removeChapter = (chapter: string): void => {
    setSelectedChapters((prev) => prev.filter((c) => c !== chapter));
  };

  const resetForm = (): void => {
    setSelectedLecturer("");
    setSelectedLecturerId(null);
    setSelectedCourseCode("");
    setSelectedCourseTitle("");
    setProgram("");
    setSessionDate("");
    setSessionType("");
    setSelectedCourseId(null);
    setSelectedGroups([]);
    setStartTime("");
    setEndTime("");
    setSelectedChapters([]);
    setTopicCovered("");
  };

  const toast = (msg: ToastMessage): void => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSaveDraft = (): void => {
    toast({
      title: t(language, "draftSaved"),
      description: t(language, "draftSavedDescription"),
    });
    resetForm();
  };

  const handleSubmit = (): void => {
    if (!selectedCourseId || !sessionDate || !sessionType || !startTime || !endTime || !selectedLecturerId || !program) {
      toast({
        title: t(language, "incompleteForm"),
        description: t(language, "completeFieldsMessage"),
      });
      return;
    }

    const newSession = {
      lecturerId: selectedLecturerId,
      courseId: selectedCourseId,
      semester: program,
      startTime: startTime,
      endTime: endTime,
      groupCode: selectedGroups.length > 0 ? selectedGroups.join(", ") : "",
      sessionType: sessionType,
      chapters: selectedChapters.length,
      sessionDate: sessionDate,
    };

    console.log("Submitting session:", JSON.stringify(newSession, null, 2));

    authFetch(`${API_BASE_URL}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSession),
    })
      .then((res) => {
        if (res.ok) {
          toast({
            title: t(language, "submittedForValidation"),
            description: `${t(language, "submittedDescription")} (${selectedCourseTitle})`,
          });
          resetForm();
          setActiveTab("validation");
          // Refresh sessions list
          authFetch(`${API_BASE_URL}/sessions`)
            .then((r) => r.json())
            .then((data) => setSessions(data));
        } else {
          return res.json().then((errorData) => {
            console.error("Backend error response:", JSON.stringify(errorData, null, 2));
            let errorMsg = "Failed to create session";
            if (errorData.message) {
              errorMsg = errorData.message;
            } else if (errorData.error) {
              errorMsg = errorData.error;
            } else if (errorData.errors) {
              errorMsg = JSON.stringify(errorData.errors);
            }
            throw new Error(errorMsg);
          }).catch((parseErr) => {
            console.error("Error parsing response:", parseErr);
            throw new Error("Failed to create session. Check console for details.");
          });
        }
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message || "Failed to create session. Please try again.",
        });
        console.error("Session creation error:", err);
      });
  };

  const deleteClassification = (id: number): void => {
    authFetch(`${API_BASE_URL}/classifications/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (res.ok) {
          toast({
            title: "Success",
            description: "Classification deleted successfully.",
          });
          // Refresh classifications list
          authFetch(`${API_BASE_URL}/classifications`)
            .then((r) => r.json())
            .then((data) => {
              setClassifications(Array.isArray(data) ? data : [data]);
              // Navigate back to validation tab after deletion
              setTimeout(() => {
                setActiveTab("validation");
                setClassificationSessions([]);
                setSelectedClassificationId(null);
              }, 500);
            });
        } else {
          return res.json().then((errorData) => {
            let errorMsg = "Failed to delete classification";
            if (errorData.message) {
              errorMsg = errorData.message;
            } else if (errorData.error) {
              errorMsg = errorData.error;
            }
            throw new Error(errorMsg);
          }).catch((parseErr) => {
            throw new Error("Failed to delete classification. Please try again.");
          });
        }
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err.message || "Failed to delete classification. Please try again.",
        });
        console.error("Deletion error:", err);
      });
  };

  const calculateDuration = (): string => {
    if (!startTime || !endTime) return "";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const diffMinutes = endH * 60 + endM - (startH * 60 + startM);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const filteredEntries = useMemo(() => {
    // Convert classifications to ScheduleEntry format for display
    const classificationEntries: ScheduleEntry[] = classifications.map((c) => {
      // Resolve group IDs "1,2" -> group codes "G001,G002"
      const groupCodes = c.groupIds
        .split(",")
        .map(id => {
          const found = teachingGroups.find(g => g.id === parseInt(id.trim()));
          return found ? found.code : id.trim(); // fallback to raw id if not found
        })
        .join(", ");

      // Count courses
      const courseCount = c.courseIds
        .split(",")
        .filter(id => id.trim() !== "")
        .length.toString();

      // Sum all minutes for Total column (backend now stores in minutes)
      const totalMinutes = (c.cmHour || 0) + (c.tdHour || 0) + (c.tpHour || 0);

      return {
        id: c.id.toString(),
        date: new Date(c.createdAt).toLocaleDateString("en-GB"),
        courseCode: c.courseIds,
        courseTitle: courseCount,
        lecturer: c.lecturer.lecturerName,
        semester: c.semester === "1" ? "Semester 1" : "Semester 2",
        sessionType: c.lecturer.grade,   // reusing sessionType field for Grade column
        groups: groupCodes,
        startTime: courseCount,          // reusing startTime field for Courses column (count)
        endTime: formatMinutes(totalMinutes),       // reusing endTime field for Total column - formatted as "4h30"
        status: (c.classifiedStatus.toLowerCase() === "validated" ? "validated" : c.classifiedStatus.toLowerCase() === "returned" ? "returned" : "pending") as ValidationStatus,
      };
    });

    return classificationEntries.filter((entry) => {
      const matchLecturer = !lecturerFilter || entry.lecturer.toLowerCase().includes(lecturerFilter.toLowerCase());
      const matchSemester = !semesterFilter || entry.semester?.toLowerCase().includes(semesterFilter.toLowerCase());
      const matchStatus = !statusFilter || entry.status.toLowerCase().includes(statusFilter.toLowerCase());
      const matchSearch = !searchText || JSON.stringify(entry).toLowerCase().includes(searchText.toLowerCase());
      return matchLecturer && matchSemester && matchStatus && matchSearch;
    });
  }, [classifications, lecturerFilter, semesterFilter, statusFilter, searchText, teachingGroups, coursesList]);
  const summaryStats = useMemo(() => ({
    total: filteredEntries.length,
    pending: filteredEntries.filter((entry) => entry.status === "pending").length,
    validated: filteredEntries.filter((entry) => entry.status === "validated").length,
    returned: filteredEntries.filter((entry) => entry.status === "returned").length,
    lecCount: new Set(filteredEntries.map((entry) => entry.lecturer)).size,
    semCount: new Set(filteredEntries.map((entry) => entry.semester)).size,
  }), [filteredEntries]);

  return (
    <div className="w-full  space-y-4">
      {showToast && (
        <div className="fixed top-4 right-4 bg-white border border-gray-300 shadow-xl p-4 z-50">
          <div className="font-semibold text-sm text-gray-800">{toastMessage.title}</div>
          <div className="text-[12px] text-gray-600">{toastMessage.description}</div>
        </div>
      )}

      {/* CLASSIFIED STATUS TABLE - DEFAULT VIEW */}
      {activeTab === "validation" && (
        <div className="space-y-4">
          {/* Header with New Teaching Session Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-bold text-gray-900">{t(language, "validationStatus")}</h2>
            <button
              onClick={() => setActiveTab("classifiedDetail")}
              className="bg-gray-700 hover:bg-gray-800 text-white p-2 text-[14px] font-semibold transition-colors shadow-md flex items-center gap-2 border border-gray-600"
            >
              <Check className="h-5 w-5" />
              Classify
            </button>
          </div>

          {!loading && (
            <div className="flex items-stretch border border-gray-200 bg-white divide-x divide-gray-200 overflow-hidden">
              {[
                { value: summaryStats.total, label: "Compilations", color: "text-violet-600", dot: "bg-violet-500" },
                { value: summaryStats.pending, label: "Pending", color: "text-yellow-600", dot: "bg-yellow-400" },
                { value: summaryStats.validated, label: "Validated", color: "text-green-600", dot: "bg-green-500" },
                { value: summaryStats.returned, label: "Returned", color: "text-amber-600", dot: "bg-amber-400" },
                { value: summaryStats.lecCount, label: "Lecturers", color: "text-orange-500", dot: "bg-orange-400" },
                { value: summaryStats.semCount, label: "Semesters", color: "text-blue-600", dot: "bg-blue-500" },
              ].map((s) => (
                <div key={s.label} className="flex-1 flex items-center gap-2 px-3 py-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className={`text-[15px] font-bold leading-none ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Filter Section */}
          <div className="bg-gray-100 border border-gray-300 p-4 flex gap-2 items-center flex-wrap">
            <select value={lecturerFilter} onChange={(e) => setLecturerFilter(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="">All Lecturers</option>
              {lecturers.map((lecturer) => (
                <option key={lecturer.id} value={lecturer.lecturerName}>{lecturer.lecturerName}</option>
              ))}
            </select>
            <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="">All Semesters</option>
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="validated">Validated</option>
              <option value="returned">Returned</option>
            </select>
            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white ml-auto" placeholder="Search sessions..." />
          </div>
          <ScheduleTable entries={filteredEntries} language={language} onClassifiedClick={(lecturer, semester) => {
            setSelectedDetailLecturer(lecturer);
            // semester arrives as "Semester 1" or "Semester 2" from filteredEntries
            // but the filter compares against classification.semester which is "1" or "2"
            setSelectedDetailSemester(
              semester === "Semester 1" ? "1" : semester === "Semester 2" ? "2" : "1"
            );
            setSelectedDetailCourse("");
            setActiveTab("classifiedDetail");
          }} />
        </div>
      )}

      {/* NEW TEACHING SESSION FORM */}
      {activeTab === "form" && (
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setActiveTab("validation")}
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

            {/* Form Content */}
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
                    const lecturerId = parseInt(e.target.value);
                    const lecturer = lecturers.find(l => l.id === lecturerId);
                    setSelectedLecturerId(lecturerId || null);
                    setSelectedLecturer(lecturer?.lecturerName || "");
                  }}
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
                  disabled={loadingData}
                >
                  <option value="">{loadingData ? "Loading lecturers..." : t(language, "selectLecturer")}</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.lecturerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div>
                <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                  {t(language, "course")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourseCode}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
                  disabled={loadingData}
                >
                  <option value="">{loadingData ? "Loading courses..." : t(language, "selectCourse")}</option>
                  {coursesList.map((course) => (
                    <option key={course.id} value={course.courseName}>
                      {course.courseName}
                    </option>
                  ))}
                </select>
                {selectedCourseTitle && (
                  <p className="text-[11px] text-gray-500 mt-1.5 italic">{selectedCourseTitle}</p>
                )}
              </div>

              {/* Semester */}
              <div>
                <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
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
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
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
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
                  disabled={loadingData}
                >
                  <option value="">{loadingData ? "Loading rooms..." : "Select room"}</option>
                  {roomsList.map((room) => (
                    <option key={room.id} value={room.roomCode}>
                      {room.roomCode} - {room.roomName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Type */}
              <div>
                <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                  {t(language, "sessionType")} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {sessionTypes.map((type) => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="courseType"
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-1">{t(language, "startTime")}</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-gray-300  px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-1">{t(language, "endTime")}</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-300  px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
                    />
                  </div>
                </div>
                {calculateDuration() && (
                  <p className="text-[11px] text-gray-600 mt-2 font-medium">
                    {t(language, "duration")}: <span className="text-gray-800">{calculateDuration()}</span>
                  </p>
                )}
              </div>

              {/* Teaching Groups */}
              <div>
                <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                  {t(language, "groups")}
                </label>
                <select
                  value=""
                  onChange={(e) => { if(e.target.value) toggleGroup(e.target.value); }}
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm"
                  disabled={loadingData}
                >
                  <option value="">{loadingData ? "Loading groups..." : t(language, "selectGroups")}</option>
                  {teachingGroups.map((group) => (
                    <option key={group.id} value={group.code}>
                      {group.code}
                    </option>
                  ))}
                </select>
                {selectedGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedGroups.map((group) => (
                      <div
                        key={group}
                        className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1 text-[12px] font-medium border border-gray-300 "
                      >
                        {group}
                        <button
                          onClick={() => removeGroup(group)}
                          className="hover:text-gray-950"
                        >
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
                  onChange={(e) => { if(e.target.value) toggleChapter(e.target.value); }}
                  className="w-full border border-gray-300  bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-[14px] shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={!selectedCourseId || loadingData}
                >
                  <option value="">
                    {!selectedCourseId ? "Select a course first" : loadingData ? "Loading chapters..." : t(language, "selectChapters")}
                  </option>
                  {chaptersList.map((chapter) => (
                    <option key={chapter.id} value={chapter.chapterName}>
                      {chapter.chapterName}
                    </option>
                  ))}
                </select>
                {selectedChapters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedChapters.map((chapter) => (
                      <div
                        key={chapter}
                        className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1 text-[12px] font-medium border border-gray-300 "
                      >
                        {chapter}
                        <button
                          onClick={() => removeChapter(chapter)}
                          className="hover:text-gray-950"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div>
                <label className="text-[12px] font-medium text-gray-700 block mb-2 uppercase tracking-wider">
                  {t(language, "topicCovered")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={topicCovered}
                  onChange={(e) => setTopicCovered(e.target.value)}
                  placeholder={language === "english" ? "Describe the topics covered, activities conducted, and any additional notes about this teaching session..." : "وصف المواضيع المغطاة والأنشطة المنفذة وأي ملاحظات إضافية حول جلسة التدريس هذه..."}
                  rows={4}
                  className="w-full border border-gray-300  px-3 py-2.5 text-gray-900 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent shadow-sm resize-none"
                />
              </div>
            </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSaveDraft}
              className="border border-gray-400 text-gray-700 hover:bg-gray-50 px-8 py-2.5 text-[14px] font-semibold  transition-colors shadow-sm"
            >
              {t(language, "saveDraft")}
            </button>
            <button
              onClick={handleSubmit}
              className="bg-gray-700 hover:bg-gray-800 text-white px-8 py-2.5 font-semibold text-[14px]  transition-colors shadow-md"
            >
              {t(language, "submit")}
            </button>
            </div>
            </div>
        </div>
      )}

      {/* CLASSIFIED DETAILS VIEW */}
      {activeTab === "classifiedDetail" && (
        <div className="space-y-6">
          <button
            onClick={() => { setActiveTab("validation"); setClassificationSessions([]); setSelectedClassificationId(null); }}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-[14px] font-medium">Back</span>
          </button>

          {classifications
            .filter(c =>
              (!selectedDetailLecturer || c.lecturer.lecturerName === selectedDetailLecturer) &&
              (!selectedDetailSemester || c.semester === selectedDetailSemester)
            )
            .map(classification => {
              const totalHours = (classification.cmHour || 0) + (classification.tdHour || 0) + (classification.tpHour || 0);
              const statusColor = classification.classifiedStatus === "VALIDATED"
                ? "bg-green-50 text-green-700 border-green-200"
                : classification.classifiedStatus === "RETURNED"
                ? "bg-orange-50 text-orange-700 border-orange-200"
                : "bg-blue-50 text-blue-700 border-blue-200";

              // Fetch sessions for this classification on first render
              const sessionIds = classification.sessionIds
                ? classification.sessionIds.split(",").map(id => id.trim()).filter(Boolean)
                : [];

              return (
                <ClassificationBlock
                  key={classification.id}
                  classification={classification}
                  totalHours={totalHours}
                  statusColor={statusColor}
                  sessionIds={sessionIds}
                  onDelete={deleteClassification}
                />
              );
            })}
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
