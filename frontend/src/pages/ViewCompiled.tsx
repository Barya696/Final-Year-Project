import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Compilation {
  id: number;
  lecturerId: number;
  departmentId: number;
  combinedTotal: number;
  compiledAt: string;
  academicYear: string;
  tarifficationStatus: "PENDING" | "TARIFFIED";
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

const fmtMinutes = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes === 0) return "0H";
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const base = h === 0 ? `${m}min` : m === 0 ? `${h}H` : `${h}h ${m}min`;
  return totalMinutes < 0 ? `-${base}` : base;
};

export default function ViewCompiled() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [compilation, setCompilation] = useState<Compilation | null>(null);
  const [lecturer, setLecturer] = useState<Lecturer | null>(null);
  const [departmentName, setDepartmentName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nid = parseInt(id || "0", 10);
    if (!nid) {
      setLoading(false);
      setError("Invalid record id.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cRes = await apiFetch(`http://localhost:8080/api/compilations/${nid}`);
        if (!cRes.ok) {
          throw new Error(cRes.status === 404 ? "Record not found" : `Request failed (${cRes.status})`);
        }
        const c: Compilation = await cRes.json();
        if (cancelled) return;
        setCompilation(c);

        const [lRes, dRes] = await Promise.all([
          apiFetch(`http://localhost:8080/api/lecturers/${c.lecturerId}`),
          apiFetch(`http://localhost:8080/api/departments/${c.departmentId}`),
        ]);
        if (lRes.ok) {
          const l: Lecturer = await lRes.json();
          if (!cancelled) setLecturer(l);
        }
        if (dRes.ok) {
          const d: Department = await dRes.json();
          if (!cancelled) setDepartmentName(d.departmentName);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load record";
        if (!cancelled && msg !== "Session ended. Please log in again.") {
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, apiFetch]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      TARIFFIED: "bg-green-50 text-green-700 border-green-200",
      PENDING: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return classes[status] ?? "bg-gray-50 text-gray-700 border-gray-200";
  };

  const statusLabel = (s: Compilation["tarifficationStatus"]) =>
    s === "TARIFFIED" ? "Tariffied" : "Pending";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-[14px]">Loading…</p>
      </div>
    );
  }

  if (error || !compilation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-[14px] mb-4">{error ?? "Record not found"}</p>
          <button
            type="button"
            onClick={() => navigate("/fiches")}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 text-[14px] font-semibold transition-colors"
          >
            Back to Compiled
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/fiches")}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-[14px] font-medium">Back</span>
        </button>
        <h1 className="text-[24px] font-bold text-gray-900">View Compiled Record</h1>
      </div>

      <div className="bg-white border-[2px] border-gray-300 p-8 shadow-sm max-w-2xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Compiled</p>
              <p className="text-[14px] text-gray-900 font-semibold">{formatDate(compilation.compiledAt)}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Academic year</p>
              <p className="text-[14px] text-gray-900 font-semibold">{compilation.academicYear}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Department</p>
              <p className="text-[14px] text-gray-900 font-semibold">{departmentName || "—"}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Lecturer</p>
              <p className="text-[14px] text-gray-900 font-semibold">{lecturer?.lecturerName ?? `Lecturer #${compilation.lecturerId}`}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Grade</p>
              <div className="inline-block bg-gray-100 text-gray-700 px-3 py-1 border border-gray-200 text-[14px] font-medium">
                {lecturer?.grade ?? "—"}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Combined teaching</p>
              <p className="text-[14px] text-gray-900 font-semibold">{fmtMinutes(compilation.combinedTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[12px] font-medium text-gray-700 uppercase tracking-wider mb-2">Tariffication</p>
              <span
                className={`inline-flex items-center justify-center w-32 px-3 py-1.5 text-[12px] font-medium border ${getStatusClass(compilation.tarifficationStatus)}`}
              >
                {statusLabel(compilation.tarifficationStatus)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
