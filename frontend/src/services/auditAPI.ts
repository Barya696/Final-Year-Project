const BASE_URL = "http://localhost:8080/api/admin/audit-logs";

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
    if (typeof value === "boolean") {
      search.set(key, value ? "true" : "false");
      return;
    }
    const s = String(value).trim();
    if (s.length > 0) search.set(key, s);
  });
  return search.toString();
};

export type AuditStatus = "SUCCESS" | "FAILURE";

export interface AuditLogDTO {
  id: number;
  action: string;
  entityName: string;
  entityId: string;
  performedBy: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  status: AuditStatus;
  createdAt: string;
}

export interface AuditPage {
  content: AuditLogDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuditStatsDTO {
  totalLogs: number;
  actionCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  entityCounts: Record<string, number>;
}

export interface AuditFilterParams {
  page?: number;
  size?: number;
  sort?: string;
  action?: string;
  entityName?: string;
  performedBy?: string;
  status?: AuditStatus | "";
  dateFrom?: string;
  dateTo?: string;
  /** Default true: hide READ-only audit rows */
  excludeRead?: boolean;
}

const AuditAPI = {
  getAuditLogs: async (filters: AuditFilterParams): Promise<AuditPage> => {
    const merged = { excludeRead: true, ...filters };
    const query = toQueryString(merged as Record<string, string | number | boolean | undefined>);
    const res = await fetch(`${BASE_URL}?${query}`, { headers: { ...authHeaders() } });
    return handleJsonResponse<AuditPage>(res);
  },

  getAuditStats: async (excludeRead = true): Promise<AuditStatsDTO> => {
    const query = toQueryString({ excludeRead });
    const res = await fetch(`${BASE_URL}/stats?${query}`, { headers: { ...authHeaders() } });
    return handleJsonResponse<AuditStatsDTO>(res);
  },

  exportAuditLogs: async (filters: Omit<AuditFilterParams, "page" | "size" | "sort">): Promise<Blob> => {
    const merged = { excludeRead: true, ...filters };
    const query = toQueryString(merged as Record<string, string | number | boolean | undefined>);
    const res = await fetch(`${BASE_URL}/export?${query}`, { headers: { ...authHeaders() } });
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
    return res.blob();
  },
};

export default AuditAPI;
