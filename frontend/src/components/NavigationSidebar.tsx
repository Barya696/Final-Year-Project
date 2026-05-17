import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  CheckCircle, 
  Settings,
  ChevronRight,
  FileText,
  Archive as ArchiveIcon,
  ClipboardList,
  DollarSign,
  Shield,
  UserCheck,
  Workflow,
  Eye,
  Sliders,
  Bell,
  Lock
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/utils/translations";
import NotificationAPI from "@/services/notificationAPI";

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature: string;
}

const navItems: NavItem[] = [
  // Role dashboards (each only visible to its owner)
  { id: "hod-dashboard", labelKey: "dashboard", icon: LayoutDashboard, requiredFeature: "HOD_DASHBOARD" },
  { id: "submittedRecords", labelKey: "dashboard", icon: FileText, requiredFeature: "VICE_DEAN_DASHBOARD" },
  { id: "fiches", labelKey: "dashboard", icon: ClipboardList, requiredFeature: "AMO_DASHBOARD" },
  { id: "required", labelKey: "requiredHours", icon: FileText, requiredFeature: "REQUIRED" },
  { id: "classified", labelKey: "classified", icon: Lock, requiredFeature: "CLASSIFIED" },
  { id: "tariffication", labelKey: "dashboard", icon: DollarSign, requiredFeature: "FINANCE_DASHBOARD" },
  { id: "tariff", labelKey: "tariff", icon: DollarSign, requiredFeature: "TARIFF" },
  { id: "approval", labelKey: "dashboard", icon: CheckCircle, requiredFeature: "DEAN_DASHBOARD" },

  // Admin-only
  { id: "admin", labelKey: "dashboard", icon: Shield, requiredFeature: "ADMIN_DASHBOARD" },
  { id: "usersDirectory", labelKey: "usersDirectory", icon: UserCheck, requiredFeature: "USERS_DIRECTORY" },
  { id: "integration", labelKey: "integration", icon: Workflow, requiredFeature: "INTEGRATION" },
  { id: "audit", labelKey: "audit", icon: Eye, requiredFeature: "AUDIT" },
  { id: "configuration", labelKey: "configuration", icon: Sliders, requiredFeature: "CONFIGURATION" },
  { id: "notificationConfig", labelKey: "notificationConfig", icon: Bell, requiredFeature: "CONFIGURATION" },
  { id: "timetable", labelKey: "timetable", icon: CalendarDays, requiredFeature: "ADMIN_DASHBOARD" },

  // Shared pages
  { id: "session", labelKey: "session", icon: Lock, requiredFeature: "SESSIONS" },
  { id: "schedules", labelKey: "teachingSchedule", icon: CalendarDays, requiredFeature: "TEACHING_SCHEDULE" },
  { id: "assignments", labelKey: "courseAssignments", icon: Users, requiredFeature: "COURSE_ASSIGNMENTS" },
  { id: "archive", labelKey: "archive", icon: ArchiveIcon, requiredFeature: "ARCHIVE" },
  { id: "notification", labelKey: "notification", icon: Bell, requiredFeature: "NOTIFICATION" },
  { id: "profile", labelKey: "profileSettings", icon: Settings, requiredFeature: "SETTINGS" },

  
];

interface NavigationSidebarProps {
  activeItem: string;
  onItemSelect: (id: string) => void;
}

const NavigationSidebar = ({ activeItem, onItemSelect }: NavigationSidebarProps) => {
  const { language } = useLanguage();
  const { hasPermission, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter((item) => hasPermission(item.requiredFeature));

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const loadUnread = async () => {
      try {
        if (!hasPermission("NOTIFICATION")) {
          if (active) setUnreadCount(0);
          return;
        }
        const rows = await NotificationAPI.getMyNotifications();
        if (!active) return;
        setUnreadCount(rows.filter((r) => r.status === "UNREAD").length);
      } catch {
        if (active) setUnreadCount(0);
      }
    };

    void loadUnread();
    timer = window.setInterval(() => {
      void loadUnread();
    }, 30000);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [hasPermission, user?.id]);

  return (
    <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <p className="text-xs uppercase tracking-wider text-sidebar-foreground/60">
          Navigation
        </p>
      </div>
      <nav className="flex-1 py-2">
        <ul className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemSelect(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 border-l-2 border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{t(language, item.labelKey as any)}</span>
                  {item.id === "notification" && unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3 w-3 text-sidebar-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50">
          Logged in as: {user?.displayRole}
        </p>
      </div>
    </aside>
  );
};

export default NavigationSidebar;
