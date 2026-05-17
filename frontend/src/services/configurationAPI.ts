const BASE_URL = "http://localhost:8080/api/configuration";

/* ─────────────────────────────────────────────────────────────────────────
   Token helper — reads the same key your AuthContext writes.
   If requests still 401/403 after this fix, console.log the localStorage
   keys and update TOKEN_KEY to match.
───────────────────────────────────────────────────────────────────────── */
const TOKEN_KEY = "authToken"; // ← change this if your AuthContext uses a different key

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) console.warn("[ConfigurationAPI] No token found in localStorage under key:", TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleJsonResponse = async <T>(res: Response): Promise<T> => {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("authUser");
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("Session ended. Please log in again.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
};

export interface ConfigurationPayload {
  id?: number;
  republicName: string;
  universityName: string;
  facultyName: string;
  departmentName: string;
  documentTitle: string;
  academicYear: string;
  referencePrefix: string;
  lecturerLabel: string;
  departmentLabel: string;
  gradeLabel: string;
  groupsLabel: string;
  numberOfCoursesLabel: string;
  referenceNumberLabel: string;
  semesterOneCmHours: number;
  semesterOneTdHours: number;
  semesterOneTpHours: number;
  semesterTwoCmHours: number;
  semesterTwoTdHours: number;
  semesterTwoTpHours: number;
  cmRate: number;
  tdRate: number;
  tpRate: number;
  financialSummaryTitle: string;
  referenceLabel: string;
  dateLabel: string;
  sectionIdentificationTitle: string;
  sectionHoursDetailTitle: string;
  typeLabel: string;
  semesterOneLabel: string;
  semesterTwoLabel: string;
  extraHoursLabel: string;
  totalsLabel: string;
  combinedTotalLabel: string;
  sectionFinancialTitle: string;
  estimatedCostLabel: string;
}

export interface PayrollRowPayload {
  id?: number;
  title: string;
  semester: string;
  hours: number;
  rate: number;
}

/* ─────────────────────────────────────────────────────────────────────────
   Standard API object — uses the localStorage token directly.
   Use this from components that don't have apiFetch available.
───────────────────────────────────────────────────────────────────────── */
const ConfigurationAPI = {
  get: async (): Promise<ConfigurationPayload> => {
    const res = await fetch(BASE_URL, {
      headers: { ...authHeaders() },
    });
    return handleJsonResponse<ConfigurationPayload>(res);
  },

  update: async (payload: ConfigurationPayload): Promise<ConfigurationPayload> => {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<ConfigurationPayload>(res);
  },

  getPayrollRows: async (): Promise<PayrollRowPayload[]> => {
    const res = await fetch(`${BASE_URL}/payroll`, {
      headers: { ...authHeaders() },
    });
    return handleJsonResponse<PayrollRowPayload[]>(res);
  },

  createPayrollRow: async (payload: PayrollRowPayload): Promise<PayrollRowPayload> => {
    const res = await fetch(`${BASE_URL}/payroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<PayrollRowPayload>(res);
  },

  updatePayrollRow: async (id: number, payload: PayrollRowPayload): Promise<PayrollRowPayload> => {
    const res = await fetch(`${BASE_URL}/payroll/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<PayrollRowPayload>(res);
  },

  deletePayrollRow: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/payroll/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    await handleJsonResponse<void>(res);
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   apiFetch-based factory — use this when you have apiFetch from useAuth().
   This is the safest option because it delegates auth entirely to your
   AuthContext, so there is no token key to guess.

   Usage in a component:
     const { apiFetch } = useAuth();
     const api = createConfigurationAPI(apiFetch);
     const cfg = await api.get();
───────────────────────────────────────────────────────────────────────── */
type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>;

export const createConfigurationAPI = (apiFetch: ApiFetch) => ({
  get: async (): Promise<ConfigurationPayload> => {
    const res = await apiFetch(BASE_URL);
    return handleJsonResponse<ConfigurationPayload>(res);
  },

  update: async (payload: ConfigurationPayload): Promise<ConfigurationPayload> => {
    const res = await apiFetch(BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<ConfigurationPayload>(res);
  },

  getPayrollRows: async (): Promise<PayrollRowPayload[]> => {
    const res = await apiFetch(`${BASE_URL}/payroll`);
    return handleJsonResponse<PayrollRowPayload[]>(res);
  },

  createPayrollRow: async (payload: PayrollRowPayload): Promise<PayrollRowPayload> => {
    const res = await apiFetch(`${BASE_URL}/payroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<PayrollRowPayload>(res);
  },

  updatePayrollRow: async (id: number, payload: PayrollRowPayload): Promise<PayrollRowPayload> => {
    const res = await apiFetch(`${BASE_URL}/payroll/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<PayrollRowPayload>(res);
  },

  deletePayrollRow: async (id: number): Promise<void> => {
    const res = await apiFetch(`${BASE_URL}/payroll/${id}`, {
      method: "DELETE",
    });
    await handleJsonResponse<void>(res);
  },
});

export default ConfigurationAPI;