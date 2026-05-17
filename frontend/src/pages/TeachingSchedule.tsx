import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchTeachingAssignments, type ApiTeachingAssignment } from "@/services/teachingAssignmentsApi";
import { t } from "@/utils/translations";

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

interface GridCourse {
  title: string;
  instructor: string;
  room: string;
  color: string;
}

const DAY_MAP: Record<string, DayKey | null> = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: null,
};

const COLOR_POOL = ["blue", "purple", "green", "orange", "teal"] as const;
const COLOR_STYLES = {
  purple: "bg-purple-100 border-purple-300",
  blue: "bg-blue-100 border-blue-300",
  green: "bg-green-100 border-green-300",
  orange: "bg-orange-100 border-orange-300",
  teal: "bg-teal-100 border-teal-300",
};

function colorForAssignment(a: ApiTeachingAssignment) {
  const idx = (a.course?.id ?? a.id) % COLOR_POOL.length;
  return COLOR_POOL[idx];
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function TeachingSchedule() {
  const { language } = useLanguage();
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<ApiTeachingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchTeachingAssignments(apiFetch);
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Failed to load teaching schedule");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  // Fixed 08:00–17:00 slots (each block covers one hour, e.g. 08:00–09:00 … 17:00–18:00)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h < 18; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, []);

  const scheduleRows = useMemo(() => {
    return timeSlots.map((time) => {
      const slotStart = toMinutes(time);
      const slotEnd = slotStart + 60;

      const row: {
        time: string;
        monday: GridCourse | null;
        tuesday: GridCourse | null;
        wednesday: GridCourse | null;
        thursday: GridCourse | null;
        friday: GridCourse | null;
        saturday: GridCourse | null;
      } = {
        time,
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
      };

      for (const a of items) {
        const start = a.timetable?.startTime?.slice(0, 5);
        const end = a.timetable?.endTime?.slice(0, 5);
        const dayKey = DAY_MAP[a.timetable?.dayOfWeek ?? ""] ?? null;
        if (!start || !dayKey) continue;
        const courseStart = toMinutes(start);
        const courseEnd = end ? toMinutes(end) : courseStart + 60;
        // Place the course in this slot if it starts within this hour block
        if (courseStart >= slotStart && courseStart < slotEnd) {
          row[dayKey] = {
            title: a.course?.courseName ?? "-",
            instructor: a.lecturer?.lecturerName ?? "-",
            room: `Room: ${a.timetable?.room?.roomName ?? "-"}`,
            color: colorForAssignment(a),
          };
        }
      }
      return row;
    });
  }, [items, timeSlots]);

  const CourseBlock = ({ course }: { course: GridCourse }) => {
    const colorClass = COLOR_STYLES[course.color as keyof typeof COLOR_STYLES] || "bg-gray-100 border-gray-300";
    return (
      <div className={`border-2 p-2 h-full ${colorClass}`}>
        <div className="text-[12px] font-semibold text-gray-900 mb-1 leading-tight">{course.title}</div>
        <div className="text-[10px] text-gray-500 mb-0.5">{course.instructor}</div>
        <div className="text-[10px] text-gray-500">{course.room}</div>
      </div>
    );
  };

  // Display label: "08:00 – 09:00", etc.
  function slotLabel(time: string) {
    const h = parseInt(time.split(":")[0], 10);
    const next = `${(h + 1).toString().padStart(2, "0")}:00`;
    return `${time} – ${next}`;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="px-3 py-2 bg-amber-50 border border-amber-300 text-[13px] text-amber-900">{error}</div>
      ) : null}

      {/* Hero Section */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-semibold text-foreground">
          {t(language, "teachingScheduleTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(language, "teachingScheduleSubtitle")}
        </p>
      </div>

      {/* Schedule Grid */}
      <div className="w-full bg-white border border-gray-300 overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="bg-gray-700 p-3 font-semibold text-[12px] text-white text-center uppercase tracking-wide border border-gray-600 w-[120px]" />
              {(
                [
                  t(language, "monday"),
                  t(language, "tuesday"),
                  t(language, "wednesday"),
                  t(language, "thursday"),
                  t(language, "friday"),
                  t(language, "saturday"),
                ] as string[]
              ).map((day, idx) => (
                <th
                  key={idx}
                  className="bg-gray-700 p-3 font-semibold text-[12px] text-white text-center uppercase tracking-wide border border-gray-600"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((row) => (
              <tr key={row.time}>
                <td className="bg-gray-50 p-3 text-[11px] font-medium text-gray-700 text-center border border-gray-300 whitespace-nowrap w-[120px]">
                  {slotLabel(row.time)}
                </td>
                {(
                  [row.monday, row.tuesday, row.wednesday, row.thursday, row.friday, row.saturday] as (GridCourse | null)[]
                ).map((course, idx) => (
                  <td key={idx} className="bg-white p-1 min-h-[60px] border border-gray-300 align-top">
                    {course && !loading ? <CourseBlock course={course} /> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}