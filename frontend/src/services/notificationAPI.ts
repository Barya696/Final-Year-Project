const BASE_URL = "http://localhost:8080/api/notifications";

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleJsonResponse = async <T>(res: Response): Promise<T> => {
  if (res.status === 401) {
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    throw new Error("Session ended. Please log in again.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
};

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const s = String(value).trim();
    if (s.length > 0) search.set(key, s);
  });
  return search.toString();
};

export interface NotificationFlowRow {
  id: number;
  name: string;
  email: string;
  initials: string;
  department: string;
  level: string;
  total: number;
  read: number;
  unread: number;
  high: number;
  medium: number;
  low: number;
  pushEnabled: boolean;
}

export interface NotificationFlowPage {
  content: NotificationFlowRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type NotificationEventType =
  | "REQUEST_SEMESTER_PENDING"
  | "REQUEST_SEMESTER_FORWARD"
  | "REQUEST_SEMESTER_COMPILED"
  | "REQUEST_SEMESTER_TARIFFIED"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGED"
  | "CUSTOM";

export interface UserNotificationItem {
  id: number;
  title: string;
  message: string;
  eventType: NotificationEventType;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "READ" | "UNREAD";
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationConfigItem {
  id: number;
  eventType: NotificationEventType;
  enabled: boolean;
  adminOnly: boolean;
}

const NotificationAPI = {
  getAdminFlow: async (params: { search?: string; page?: number; size?: number }): Promise<NotificationFlowPage> => {
    const query = toQueryString({
      search: params.search,
      page: params.page ?? 0,
      size: params.size ?? 6,
    });
    const res = await fetch(`${BASE_URL}/admin/flow?${query}`, { headers: { ...authHeaders() } });
    return handleJsonResponse<NotificationFlowPage>(res);
  },

  updatePushPreference: async (userId: number, enabled: boolean): Promise<{ userId: number; pushEnabled: boolean }> => {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/push`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ enabled }),
    });
    return handleJsonResponse<{ userId: number; pushEnabled: boolean }>(res);
  },

  getMyNotifications: async (): Promise<UserNotificationItem[]> => {
    const res = await fetch(`${BASE_URL}/me`, { headers: { ...authHeaders() } });
    return handleJsonResponse<UserNotificationItem[]>(res);
  },

  markAsRead: async (notificationId: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${notificationId}/read`, {
      method: "PATCH",
      headers: { ...authHeaders() },
    });
    await handleJsonResponse(res);
  },

  getConfig: async (): Promise<NotificationConfigItem[]> => {
    const res = await fetch(`${BASE_URL}/admin/config`, { headers: { ...authHeaders() } });
    return handleJsonResponse<NotificationConfigItem[]>(res);
  },

  updateConfig: async (
    id: number,
    payload: { enabled?: boolean; adminOnly?: boolean },
  ): Promise<NotificationConfigItem> => {
    const res = await fetch(`${BASE_URL}/admin/config/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<NotificationConfigItem>(res);
  },
};

export default NotificationAPI;
