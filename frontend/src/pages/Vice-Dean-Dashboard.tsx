import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/utils/translations";
import { ArrowLeft } from "lucide-react";
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

const asArray = <T,>(value: T | T[] | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const ClassificationBlock = ({
  classification,
  totalHours,
  statusColor,
  sessionIds,
  onForward,
  onReturn,
  classificationId,
}: {
  classification: Classification;
  totalHours: number;
  statusColor: string;
  sessionIds: string[];
  onForward?: (id: number) => void;
  onReturn?: (id: number) => void;
  classificationId?: number;
}) => {
  const { apiFetch } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionIds.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      sessionIds.map(id =>
        safeJsonFetch<Session>(apiFetch, `${API_BASE_URL}/sessions/${id}`)
      )
    )
      .then(results => setSessions(results.filter((s): s is Session => !!s)))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [classification.id, apiFetch]);

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
              {["Course", "Semester", "Start", "End", "Hours", "Group", "Type", "Chapters", "Date"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[13px] font-medium text-white whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {sessions.map((session, idx, arr) => (
              <tr key={session.id} className={`hover:bg-gray-50 ${idx !== arr.length - 1 ? "border-b border-gray-200" : ""}`}>
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
          <div className="flex gap-2">
            {onForward && classificationId !== undefined && (
              <button
                onClick={() => onForward(classificationId)}
                disabled={classification.classifiedStatus === "VALIDATED"}
                className={`px-3 py-1.5 text-white text-[12px] font-medium transition-colors ${
                  classification.classifiedStatus === "VALIDATED"
                    ? "bg-green-400 cursor-not-allowed opacity-50"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Forward
              </button>
            )}
            {onReturn && classificationId !== undefined && (
              <button
                onClick={() => onReturn(classificationId)}
                disabled={classification.classifiedStatus === "VALIDATED"}
                className={`px-3 py-1.5 text-white text-[12px] font-medium transition-colors ${
                  classification.classifiedStatus === "VALIDATED"
                    ? "bg-red-400 cursor-not-allowed opacity-50"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Return
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SubmissionRow {
  department: string;
  period: string;
  entries: number;
  date: string;
  submittedBy: string;
  status: "Pending" | "Returned" | "Forwarded";
  remarks: string;
  topics: any[];
  documentId: string;
}

interface SubmissionData {
  [key: number]: SubmissionRow;
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
  sessionIds: string;
  semester: string;
  cmHour: number;
  tdHour: number;
  tpHour: number;
  classifiedStatus: "PENDING" | "VALIDATED" | "RETURNED";
  createdAt: string;
  updatedAt?: string;
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

const SubmissionsDashboard = () => {
  const { apiFetch } = useAuth();
  const [showClassifiedDetail, setShowClassifiedDetail] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [selectedDetailLecturer, setSelectedDetailLecturer] = useState<string>("");
  const [selectedDetailSemester, setSelectedDetailSemester] = useState<string>("1");
  const [data, setData] = useState<SubmissionData>({});
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [returnModal, setReturnModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [returnRemarks, setReturnRemarks] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch classifications from API
  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/classifications`);
        if (response.ok) {
          const data = await response.json();
          setClassifications(Array.isArray(data) ? data : [data]);
        }
      } catch (error) {
        console.error("Error fetching classifications:", error);
      }
    };
    fetchClassifications();
  }, [apiFetch]);

  // Fetch submissions data from API
  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const [classificationsRes, departmentsRes] = await Promise.all([
          apiFetch(`${API_BASE_URL}/classifications`),
          apiFetch(`${API_BASE_URL}/departments`),
        ]);

        if (classificationsRes.ok && departmentsRes.ok) {
          const classifications = asArray(await classificationsRes.json());
          const departments = asArray(await departmentsRes.json());

          // Map department id -> departmentName from the departments table
          const departmentMap: { [key: number]: string } = {};
          departments.forEach((dept: any) => {
            departmentMap[dept.id] = dept.departmentName;
          });

          const transformedData: SubmissionData = {};
          classifications.forEach((classification: any, index: number) => {
            const semester = classification.semester === "1" ? "Semester 1" : "Semester 2";

            // Look up department name using departmentId from classification
            const departmentName = departmentMap[classification.departmentId] || "Unknown Department";
            
            // Generate unique sequential document ID
            const documentId = `#DOC-${String(index + 1).padStart(4, "0")}`;

            transformedData[index + 1] = {
              department: departmentName,
              period: `${semester}, 2025/2026`,
              entries: classification.sessionIds
                ? classification.sessionIds.split(",").length
                : 0,
              date: new Date(classification.createdAt).toLocaleString("en-GB"),
              submittedBy: classification.lecturerName || "Unknown",
              status: (classification.classifiedStatus === "PENDING"
                ? "Pending"
                : classification.classifiedStatus === "VALIDATED"
                ? "Forwarded"
                : "Returned") as "Pending" | "Forwarded" | "Returned",
              remarks: "",
              documentId: documentId,
              topics: [],
            };
          });

          setData(transformedData);
        }
      } catch (error) {
        console.error("Error fetching classifications and departments:", error);
      }
    };

    fetchClassifications();
  }, [apiFetch]);

  const filteredRows = useMemo(() => {
    return Object.entries(data).filter(([_, row]) => {
      const matchDept = !departmentFilter || row.department.toLowerCase().includes(departmentFilter.toLowerCase());
      const matchStatus = !statusFilter || row.status.toLowerCase().includes(statusFilter.toLowerCase());
      const matchSearch = !searchText || JSON.stringify(row).toLowerCase().includes(searchText.toLowerCase());
      let matchDate = true;
      if (dateFilter) {
        const parsed = new Date(row.date);
        if (!isNaN(parsed.getTime())) {
          const iso = parsed.toISOString().slice(0, 10);
          matchDate = iso === dateFilter;
        } else {
          matchDate = false;
        }
      }
      return matchDept && matchStatus && matchSearch && matchDate;
    });
  }, [data, departmentFilter, statusFilter, searchText, dateFilter]);
  const summaryStats = useMemo(() => {
    const rows = Object.values(data);
    return {
      total: rows.length,
      pending: rows.filter((row) => row.status === "Pending").length,
      forwarded: rows.filter((row) => row.status === "Forwarded").length,
      returned: rows.filter((row) => row.status === "Returned").length,
      deptCount: new Set(rows.map((row) => row.department)).size,
      lecCount: new Set(rows.map((row) => row.submittedBy)).size,
    };
  }, [data]);

  // Pagination
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [departmentFilter, statusFilter, searchText, dateFilter]);

  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const stripRole = (name: string) => {
    // Remove trailing parenthetical roles like " (Head of Department)"
    return name ? name.replace(/\s*\([^)]*\)\s*$/,'').trim() : name;
  };

  const getStatusBadgeClasses = (status: string) => {
    const statusMap: { [key: string]: string } = {
      "Pending": "bg-blue-50 text-blue-700 border-blue-200",
      "Returned": "bg-orange-50 text-orange-700 border-orange-200",
      "Forwarded": "bg-green-50 text-green-700 border-green-200",
    };
    return statusMap[status] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const handleForward = async (id: number) => {
    if (confirm("Are you sure you want to forward this submission to the Academic Monitoring Officer?")) {
      try {
        const submissionData = data[id];
        const lecturerName = stripRole(submissionData.submittedBy);
        const semester = submissionData.period.includes('Semester 1') ? '1' : '2';

        // Find the classification ID from the classifications array by matching lecturer name and semester
        const classification = classifications.find(c => 
          c.lecturer.lecturerName === lecturerName && c.semester === semester
        );

        if (!classification) {
          showNotification(`Unable to find classification record for ${lecturerName}.`, "error");
          return;
        }

        const classificationId = classification.id;

        // Update the classification status in the database with complete object
        const response = await apiFetch(`${API_BASE_URL}/classifications/${classificationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: classification.id,
            lecturer: classification.lecturer,
            courseIds: classification.courseIds,
            groupIds: classification.groupIds,
            sessionIds: classification.sessionIds,
            semester: classification.semester,
            cmHour: classification.cmHour,
            tdHour: classification.tdHour,
            tpHour: classification.tpHour,
            classifiedStatus: "VALIDATED",
            createdAt: classification.createdAt,
            updatedAt: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const timestamp = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
          setData((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              status: "Forwarded",
              remarks: `Submission reviewed and forwarded to Academic Monitoring Officer for further processing. - Dr. Helen Richards, ${timestamp}`,
            },
          }));
          
          // Refresh classifications to reflect the change
          const classificationsRes = await apiFetch(`${API_BASE_URL}/classifications`);
          if (classificationsRes.ok) {
            const updatedClassifications = await classificationsRes.json();
            setClassifications(Array.isArray(updatedClassifications) ? updatedClassifications : [updatedClassifications]);
          }
          
          showNotification(`Submission from ${data[id].department} has been forwarded to the Academic Monitoring Officer.`);
        } else {
          const errorMessage = await response.text();
          console.error("Response error:", errorMessage);
          showNotification("Failed to forward submission. Please try again.", "error");
        }
      } catch (error) {
        console.error("Error forwarding submission:", error);
        showNotification("An error occurred while forwarding the submission.", "error");
      }
    }
  };

  const handleReturn = (id: number) => {
    setReturnModal({ open: true, id });
  };

  const confirmReturn = async () => {
    if (!returnRemarks.trim()) {
      showNotification("Remarks are mandatory when returning a submission.", "error");
      return;
    }
    try {
      const id = returnModal.id!;
      const submissionData = data[id];
      const lecturerName = stripRole(submissionData.submittedBy);
      const semester = submissionData.period.includes('Semester 1') ? '1' : '2';

      // Find the classification ID from the classifications array by matching lecturer name and semester
      const classification = classifications.find(c => 
        c.lecturer.lecturerName === lecturerName && c.semester === semester
      );

      if (!classification) {
        showNotification(`Unable to find classification record for ${lecturerName}.`, "error");
        return;
      }

      const classificationId = classification.id;

      // Update the classification status in the database with complete object
      const response = await apiFetch(`${API_BASE_URL}/classifications/${classificationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: classification.id,
          lecturer: classification.lecturer,
          courseIds: classification.courseIds,
          groupIds: classification.groupIds,
          sessionIds: classification.sessionIds,
          semester: classification.semester,
          cmHour: classification.cmHour,
          tdHour: classification.tdHour,
          tpHour: classification.tpHour,
          classifiedStatus: "RETURNED",
          createdAt: classification.createdAt,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const timestamp = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
        setData((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            status: "Returned",
            remarks: `${returnRemarks} - Dr. Helen Richards, ${timestamp}`,
          },
        }));
        
        // Refresh classifications to reflect the change
        const classificationsRes = await apiFetch(`${API_BASE_URL}/classifications`);
        if (classificationsRes.ok) {
          const updatedClassifications = await classificationsRes.json();
          setClassifications(Array.isArray(updatedClassifications) ? updatedClassifications : [updatedClassifications]);
        }
        
        showNotification(`Submission from ${data[id].department} has been returned to the department.`);
        setReturnModal({ open: false, id: null });
        setReturnRemarks("");
      } else {
        const errorMessage = await response.text();
        console.error("Response error:", errorMessage);
        showNotification("Failed to return submission. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error returning submission:", error);
      showNotification("An error occurred while returning the submission.", "error");
    }
  };

  const handleViewDetails = (id: number) => {
    const row = data[id];
    const lecturer = stripRole(row.submittedBy);
    const semester = row.period.includes('Semester 1') ? '1' : '2';
    setSelectedDetailLecturer(lecturer);
    setSelectedDetailSemester(semester);
    setShowClassifiedDetail({ open: true, id });
  };

  return (
    <>
      {/* CLASSIFIED DETAILS VIEW */}
      {showClassifiedDetail.open && showClassifiedDetail.id !== null && (
        <div className="space-y-6">
          <button
            onClick={() => setShowClassifiedDetail({ open: false, id: null })}
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

              // Fetch sessions for this classification
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
                  classificationId={showClassifiedDetail.id || undefined}
                  onForward={handleForward}
                  onReturn={handleReturn}
                />
              );
            })}
        </div>
      )}

      {!showClassifiedDetail.open && (
        <>
          <style>{`
            .table-header { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .stat-card { background: white; border: 2px solid #d1d5db; padding: 0.5rem; display: flex; flex-direction: column; position: relative; }
            .stat-label { color: #6b7280; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
            .stat-value { color: #111827; font-size: 1rem; font-weight: 700; }
            .stat-icon { position: absolute; top: 0.5rem; right: 0.75rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; opacity: 0.2; }
            .stat-value-blue { color: #1e40af; }
            .stat-icon-blue { color: #1e40af; }
            .stat-value-yellow { color: #b45309; }
            .stat-icon-yellow { color: #b45309; }
            .stat-value-green { color: #047857; }
            .stat-icon-green { color: #047857; }
            .stat-value-gray { color: #374151; }
            .stat-icon-gray { color: #374151; }
            .filter-select { background: white; color: #374151; border: 1px solid #9ca3af; padding: 0.5rem 0.75rem; font-size: 0.875rem; cursor: pointer; }
            .search-input { width: 100%; background: white; color: #374151; border: 1px solid #9ca3af; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
            .btn { padding: 0.375rem 0.75rem; border: none; font-size: 0.75rem; font-weight: 500; cursor: pointer; border-radius: 0; }
            .btn-view { background: #3b82f6; color: white; }
            .btn-forward { background: #10b981; color: white; }
            .btn-return { background: #ef4444; color: white; }
            .btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
            .modal.active { display: flex; }
            .modal-content { background: white; width: 90%; max-width: 700px; max-height: 85vh; overflow-y: auto; border: 1px solid #9ca3af; }
            .modal-header { background: #374151; color: white; padding: 1rem; border-bottom: 1px solid #9ca3af; }
            .modal-body { padding: 1.25rem; }
            .modal-footer { background: #f9fafb; padding: 0.75rem 1rem; border-top: 1px solid #9ca3af; display: flex; gap: 0.5rem; justify-content: flex-end; }
            .notification { position: fixed; top: 1rem; right: 1rem; padding: 0.75rem 1rem; color: white; z-index: 2000; animation: slideIn 0.3s; font-size: 0.875rem; }
            .notification.success { background: #059669; }
            .notification.error { background: #dc2626; }
            .action-grid { display: inline-grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background-color: #cbd5e0; }
            .texture-box { minHeight: 150px; }
            @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          `}</style>

          <div className="flex items-stretch border border-gray-200 bg-white divide-x divide-gray-200 overflow-hidden">
            {[
              { value: summaryStats.total, label: "Documents", color: "text-violet-600", dot: "bg-violet-500" },
              { value: summaryStats.pending, label: "Pending", color: "text-yellow-600", dot: "bg-yellow-400" },
              { value: summaryStats.forwarded, label: "Forwarded", color: "text-green-600", dot: "bg-green-500" },
              { value: summaryStats.returned, label: "Returned", color: "text-amber-600", dot: "bg-amber-400" },
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

          {/* Filter Section */}
          <div className="bg-gray-100 border border-gray-300 p-4 mb-5 flex gap-2 items-center">
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Engineering">Engineering</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Returned">Returned</option>
              <option value="Forwarded">Forwarded</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm bg-white"
            />
            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="border border-gray-300 px-2 py-1 text-sm bg-white ml-auto" placeholder="Search documents..." />
          </div>

          {/* Table */}
          <div className="bg-white overflow-hidden border border-gray-300">
            <table className="min-w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-[14px] font-medium text-white table-header" style={{ backgroundColor: "#3a4a5c" }}>Department</th>
                  <th className="px-2 py-2 text-left text-[14px] font-medium text-white table-header" style={{ backgroundColor: "#4a5568" }}>Period</th>
                  <th className="px-2 py-2 text-left text-[14px] font-medium text-white table-header" style={{ backgroundColor: "#3a4a5c" }}>Lecturer</th>
                  <th className="px-2 py-2 text-left text-[14px] font-medium text-white table-header" style={{ backgroundColor: "#4a5568" }}>Document ID</th>
                  <th className="px-2 py-2 text-left text-[14px] font-medium text-white table-header" style={{ backgroundColor: "#3a4a5c" }}>Status</th>
                  <th className="px-2 py-2 text-left text-[14px] font-medium text-white table-header" style={{ backgroundColor: "#4a5568" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedRows.map(([id, row], idx) => {
                  const isDisabled = row.status !== "Pending";
                  return (
                    <tr
                      key={id}
                      className={`hover:bg-gray-50 transition-colors ${idx !== paginatedRows.length - 1 ? "border-b border-gray-200" : ""}`}
                    >
                      <td className="px-2 py-1 text-[14px] text-gray-900">{row.department}</td>
                      <td className="px-2 py-1 text-[14px] text-gray-700">{row.period}</td>
                      <td className="px-2 py-1 text-[14px] text-gray-900">{row.submittedBy}</td>
                      <td className="px-2 py-1 text-[14px] text-gray-700">{row.documentId}</td>
                      <td className="px-2 py-1 text-[14px] text-gray-700">
                        <span className={`flex items-center justify-center w-32 px-3 py-1.5 text-[12px] font-medium border ${getStatusBadgeClasses(row.status)}`}>{row.status}</span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="action-grid">
                          <div className="bg-white p-1">
                            <button onClick={() => handleViewDetails(parseInt(id))} className="btn btn-view w-full">
                              View
                            </button>
                          </div>
                          <div className="bg-white p-1">
                            <button onClick={() => handleForward(parseInt(id))} className="btn btn-forward w-full" disabled={isDisabled}>
                              Forward
                            </button>
                          </div>
                          <div className="bg-white p-1">
                            <button onClick={() => handleReturn(parseInt(id))} className="btn btn-return w-full" disabled={isDisabled}>
                              Return
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Return Modal */}
          {returnModal.open && (
            <div className="modal active" onClick={() => setReturnModal({ open: false, id: null })}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="text-lg font-semibold">Return Submission to Department</h3>
                </div>
                <div className="modal-body">
                  <div className="mb-4">
                    <label className="block font-semibold text-gray-700 mb-2">
                      Remarks <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={returnRemarks}
                      onChange={(e) => setReturnRemarks(e.target.value)}
                      className="w-full border border-gray-300 p-3 font-sans texture-box"
                      placeholder="Please provide detailed remarks explaining the reason for return..."
                    ></textarea>
                    <small className="block mt-2 text-gray-600">Remarks are mandatory when returning a submission to the department.</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button onClick={() => setReturnModal({ open: false, id: null })} className="btn bg-gray-500 text-white">
                    Cancel
                  </button>
                  <button onClick={confirmReturn} className="btn bg-blue-700 text-white">
                    Confirm Return
                  </button>
                </div>
              </div>
            </div>
          )}
                    {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Rows per page:</label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 bg-white disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-2 py-1 border ${p === currentPage ? "bg-gray-200" : "bg-white"} border-gray-300 text-sm`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`notification ${notification.type}`}>{notification.message}</div>
          )}
        </>
      )}
    </>
  );
};

export default function SubmittedRecords() {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">

      {/* Submissions Dashboard */}
      <SubmissionsDashboard />
    </div>
  );
}
