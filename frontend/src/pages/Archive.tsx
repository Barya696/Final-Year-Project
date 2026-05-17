import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ArchiveRow {
  id: number;
  tarifficationId: number;
  archived: boolean;
  archivedAt?: string | null;
}

interface Tariffication {
  id: number;
  compilationId: number;
}

interface Compilation {
  id: number;
  lecturerId: number;
  s1Extra: number;
  s2Extra: number;
  combinedTotal: number;
  compiledAt: string;
}

interface Lecturer {
  id: number;
  lecturerName: string;
  grade: string;
}

const toHours = (minutes: number | undefined | null): string => {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  return m === 0 ? `${h}H` : `${h}h ${m}min`;
};

const fmtDate = (value: string | undefined | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function Archive() {
  const { apiFetch } = useAuth();
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [tariffications, setTariffications] = useState<Tariffication[]>([]);
  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2800);
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, tRes, cRes, lRes] = await Promise.all([
        apiFetch("http://localhost:8080/api/archive"),
        apiFetch("http://localhost:8080/api/tariffication"),
        apiFetch("http://localhost:8080/api/compilations"),
        apiFetch("http://localhost:8080/api/lecturers"),
      ]);
      if (!aRes.ok) throw new Error(`Archive: ${aRes.status}`);
      if (!tRes.ok) throw new Error(`Tariffication: ${tRes.status}`);
      if (!cRes.ok) throw new Error(`Compilations: ${cRes.status}`);
      if (!lRes.ok) throw new Error(`Lecturers: ${lRes.status}`);

      const [aData, tData, cData, lData] = await Promise.all([
        aRes.json(),
        tRes.json(),
        cRes.json(),
        lRes.json(),
      ]);
      setRows((aData as ArchiveRow[]).filter((r) => r.archived));
      setTariffications(tData as Tariffication[]);
      setCompilations(cData as Compilation[]);
      setLecturers(lData as Lecturer[]);
    } catch (e: any) {
      if (e?.message !== "Session ended. Please log in again.") {
        setError(e?.message ?? "Failed to load archive data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tarifficationById = useMemo(() => new Map(tariffications.map((t) => [t.id, t])), [tariffications]);
  const compilationById = useMemo(() => new Map(compilations.map((c) => [c.id, c])), [compilations]);
  const lecturerById = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);

  const unarchive = async (row: ArchiveRow) => {
    setBusyId(row.id);
    try {
      const res = await apiFetch(`http://localhost:8080/api/archive/tariffication/${row.tarifficationId}/unarchive`, {
        method: "PUT",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Unarchive failed (${res.status})`);
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showToastMessage(`Tariffication #${row.tarifficationId} unarchived successfully.`);
    } catch (e: any) {
      if (e?.message !== "Session ended. Please log in again.") {
        showToastMessage(e?.message ?? "Unarchive failed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Archive
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track archived teaching schedules and course sessions.
        </p>
      </div>
      {error ? (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{error}</div>
      ) : null}

      {/* Classified Status Table */}
      <div className="bg-white overflow-hidden border border-gray-300">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Semester
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Lecturers
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Grade
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Groupe(s)
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Courses
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-[14px] font-medium text-white">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((entry, index) => {
                const tar = tarifficationById.get(entry.tarifficationId);
                const comp = tar ? compilationById.get(tar.compilationId) : undefined;
                const lecturer = comp ? lecturerById.get(comp.lecturerId) : undefined;
                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      index !== rows.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-[14px] text-gray-900">
                      {fmtDate(entry.archivedAt ?? comp?.compiledAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[14px] font-medium text-gray-900">
                      {comp ? `S1/S2` : "—"}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-gray-900">
                      {lecturer?.lecturerName ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[12px] font-medium border border-gray-200">
                        {lecturer?.grade ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-gray-700">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[14px] text-gray-900 font-mono">
                      {tar ? `TAR-${tar.id}` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[14px] text-gray-900 font-mono">
                      {toHours(comp?.combinedTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={busyId === entry.id}
                        onClick={() => void unarchive(entry)}
                        className="bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-1.5 text-[12px] font-semibold transition-colors"
                      >
                        {busyId === entry.id ? "..." : "Unarchive"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {rows.map((entry) => {
            const tar = tarifficationById.get(entry.tarifficationId);
            const comp = tar ? compilationById.get(tar.compilationId) : undefined;
            const lecturer = comp ? lecturerById.get(comp.lecturerId) : undefined;
            return (
            <div
              key={entry.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-[13px] text-gray-900">{tar ? `TAR-${tar.id}` : "—"}</div>
                  <div className="text-[12px] text-gray-600 mt-0.5">{fmtDate(entry.archivedAt ?? comp?.compiledAt)}</div>
                </div>
                <button
                  type="button"
                  disabled={busyId === entry.id}
                  onClick={() => void unarchive(entry)}
                  className="bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ml-2"
                >
                  {busyId === entry.id ? "..." : "Unarchive"}
                </button>
              </div>
              
              <div className="text-[13px] text-gray-900 mb-2 font-medium">
                {lecturer?.lecturerName ?? "—"}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 text-[14px] font-medium border border-gray-200">
                  {lecturer?.grade ?? "—"}
                </span>
                <span className="inline-block bg-gray-50 text-gray-600 px-3 py-1 text-[14px] border border-gray-200">
                  {toHours(comp?.combinedTotal)}
                </span>
              </div>
            </div>
          )})}
        </div>

      </div>

      {showToast && (
        <div className="fixed top-4 right-4 bg-white border border-gray-300 shadow-xl p-4 z-50">
          <div className="text-[12px] text-gray-600">{toastMessage}</div>
        </div>
      )}
    </div>
  );
}
