// src/services/usersAPI.ts
// Reads "authToken" from localStorage — same key AuthContext saves on login.
// Any 401 response (blocked user, expired token) triggers redirect to /login.

const BASE_URL = "http://localhost:8080/api/users";

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("authToken"); // matches AuthContext key
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    // Blocked or expired — clear storage and go to login
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    throw new Error("Session ended. Please log in again.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = "";
    if (text) {
      try {
        const j = JSON.parse(text) as { error?: string; fields?: Record<string, string> };
        if (j.fields && Object.keys(j.fields).length > 0) {
          msg = Object.entries(j.fields)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
        } else if (typeof j.error === "string" && j.error) {
          msg = j.error;
        } else {
          msg = text;
        }
      } catch {
        msg = text;
      }
    }
    throw new Error(msg.trim() || `HTTP ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  department?: { id: number; departmentName: string };
  status: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "HOD" | "VICE_DEAN" | "AMO" | "FINANCE_OFFICER" | "DEAN";
  departmentId?: number | null;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  role: "ADMIN" | "HOD" | "VICE_DEAN" | "AMO" | "FINANCE_OFFICER" | "DEAN";
  departmentId?: number | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

const UsersAPI = {
  getAllUsers: async (): Promise<ApiUser[]> => {
    const res = await fetch(BASE_URL, { headers: { ...authHeaders() } });
    return handleResponse(res);
  },

  createUser: async (data: CreateUserPayload): Promise<ApiUser> => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateUser: async (id: number, data: UpdateUserPayload): Promise<ApiUser> => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updatePassword: async (id: number, password: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${id}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ password }),
    });
    return handleResponse(res);
  },

  /**
   * PATCH /api/users/{id}/status  (toggle endpoint — no @PreAuthorize)
   * Server flips ACTIVE <-> INACTIVE.
   * The blocked user's next request hits JwtAuthFilter which checks DB status,
   * sees INACTIVE, returns 401 → handleResponse redirects them to /login.
   */
  updateUserStatus: async (
    id: number,
    _newStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ): Promise<ApiUser> => {
    const res = await fetch(`${BASE_URL}/${id}/status`, {
      method: "PATCH",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  deleteUser: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },
};

export default UsersAPI;