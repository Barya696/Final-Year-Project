import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import InstitutionalHeader from "@/components/InstitutionalHeader";
import NavigationSidebar from "@/components/NavigationSidebar";
import { useAuth, ROLE_DEFAULT_NAV } from "@/contexts/AuthContext";
import HODDashboard from "@/pages/HOD-Dashboard";
import TeachingSchedule from "@/pages/TeachingSchedule";
import CourseAssignments from "@/pages/CourseAssignments";
import Archive from "@/pages/Archive";
import Fiches from "@/pages/Monitoring-Officer-Dashboard";
import ProfileSettings from "@/pages/ProfileSettings";
import SubmittedRecords from "@/pages/Vice-Dean-Dashboard";
import FinanceDashboard from "@/pages/Finance-Dashboard";
import DeanDashboard from "@/pages/Dean-Dashboard";
import Admin from "@/pages/Admin-Dashboard";
import UsersDirectory from "@/pages/Users-directory";
import Integration from "@/pages/Integration";
import Audit from "@/pages/Audit";
import Configuration from "@/pages/Configuration";
import Notification from "@/pages/Notification";
import NotificationConfig from "@/pages/NotificationConfig";
import Session from "@/pages/Session";
import Classified from "@/pages/Classified";
import Required from "@/pages/Required";
import Tariff from "@/pages/Tariff";
import Timetable from "@/pages/Timetable";

const PAGE_MAP: Record<string, ReactNode> = {
  "hod-dashboard": <HODDashboard />,
  schedules: <TeachingSchedule />,
  assignments: <CourseAssignments />,
  archive: <Archive />,
  fiches: <Fiches />,
  required: <Required />,
  tariff: <Tariff />,
  submittedRecords: <SubmittedRecords />,
  tariffication: <FinanceDashboard />,
  approval: <DeanDashboard />,
  admin: <Admin />,
  usersDirectory: <UsersDirectory />,
  integration: <Integration />,
  audit: <Audit />,
  configuration: <Configuration />,
  notificationConfig: <NotificationConfig />,
  notification: <Notification />,
  session: <Session />,
  classified: <Classified />,
  profile: <ProfileSettings />,
  timetable: <Timetable />,
};

const Index = () => {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState(() =>
    user ? ROLE_DEFAULT_NAV[user.displayRole] : "hod-dashboard"
  );

  useEffect(() => {
    const onNavigateSidebar = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const nextNav = customEvent.detail;
      if (nextNav && PAGE_MAP[nextNav]) {
        setActiveNav(nextNav);
      }
    };
    window.addEventListener("app:navigate-sidebar", onNavigateSidebar);
    return () => {
      window.removeEventListener("app:navigate-sidebar", onNavigateSidebar);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <InstitutionalHeader
        universityName="Université de N'Djaména"
        facultyName="Faculty of Science and Technology"
        academicYear="2024 / 2025"
      />

      <div className="flex flex-1">
        <NavigationSidebar activeItem={activeNav} onItemSelect={setActiveNav} />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {PAGE_MAP[activeNav] ?? (
              <p className="text-muted-foreground text-sm">
                Select a section from the sidebar.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;