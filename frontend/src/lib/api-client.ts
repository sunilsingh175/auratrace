import {
  Incident,
  Service,
  SystemStats,
  InfrastructureStatus,
  UserAccount,
} from "@/types";
import {
  MOCK_SERVICES,
  MOCK_INCIDENTS,
  MOCK_SYSTEM_STATS,
  MOCK_INFRASTRUCTURE_STATUS,
  MOCK_USERS,
} from "./mockData";

export * from "@/types";
export type ServiceItem = Service;

const API_BASE_URL = "/api/aura";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  return fetch(
    `${API_BASE_URL}?path=${encodeURIComponent(path.replace(/^\//, ""))}`,
    {
      ...options,
      headers,
      cache: "no-store",
    }
  );
}

// In-memory local stores for interactive mutations during runtime / demo
let localServices: Service[] = [...MOCK_SERVICES];
let localIncidents: Incident[] = [...MOCK_INCIDENTS];
let localUsers: UserAccount[] = [...MOCK_USERS];

export async function fetchIncidents(params?: {
  status?: string;
  service_id?: string;
  limit?: number;
}): Promise<Incident[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") query.set("status_filter", params.status);
    if (params?.service_id) query.set("service_id", params.service_id);
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await request(`incidents?${query}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Map backend schema to unified Incident format
        return data.map((item: any) => ({
          id: item.id || `INC-${Math.floor(Math.random() * 9000 + 1000)}`,
          service_id: item.service_id || "payment-api",
          title: item.title || item.error_type || "Anomaly Detected",
          error_type: item.error_type || "System Anomaly",
          severity: item.severity || (item.anomaly_score > 0.85 ? "critical" : item.anomaly_score > 0.7 ? "high" : "medium"),
          status: item.status || "OPEN",
          anomaly_score: typeof item.anomaly_score === "number" ? item.anomaly_score : 0.85,
          created_at: item.created_at || new Date().toISOString(),
          resolved_at: item.resolved_at,
          stack_trace: item.raw_stack_trace || item.stack_trace,
          ai_root_cause: item.ai_root_cause,
          ai_recommended_fix: item.ai_suggested_patch || item.ai_recommended_fix,
          code_diff: item.code_diff,
          system_metrics: item.system_metrics,
          similar_incidents: item.similar_incidents,
        }));
      }
    }
  } catch (error) {
    console.warn("Backend API unavailable, using local data layer:", error);
  }

  // Filter local store
  let results = [...localIncidents];
  if (params?.status && params.status !== "ALL") {
    results = results.filter((inc) => inc.status === params.status);
  }
  if (params?.service_id) {
    results = results.filter((inc) => inc.service_id === params.service_id);
  }
  if (params?.limit) {
    results = results.slice(0, params.limit);
  }
  return results;
}

export async function fetchIncidentById(id: string): Promise<Incident | null> {
  try {
    const res = await request(`incidents/${encodeURIComponent(id)}`);
    if (res.ok) {
      const item = await res.json();
      if (item && item.id) {
        return {
          id: item.id,
          service_id: item.service_id || "payment-api",
          title: item.title || item.error_type || "Anomaly Detected",
          error_type: item.error_type || "System Anomaly",
          severity: item.severity || (item.anomaly_score > 0.85 ? "critical" : "high"),
          status: item.status || "OPEN",
          anomaly_score: item.anomaly_score || 0.88,
          created_at: item.created_at || new Date().toISOString(),
          resolved_at: item.resolved_at,
          stack_trace: item.raw_stack_trace || item.stack_trace,
          ai_root_cause: item.ai_root_cause,
          ai_recommended_fix: item.ai_suggested_patch || item.ai_recommended_fix,
          code_diff: item.code_diff,
          system_metrics: item.system_metrics,
          similar_incidents: item.similar_incidents,
        };
      }
    }
  } catch {
    // fallback to mock
  }

  const found = localIncidents.find((i) => i.id === id);
  return found || localIncidents[0] || null;
}

export async function updateIncidentStatus(
  id: string,
  status: "OPEN" | "INVESTIGATING" | "RESOLVED"
): Promise<Incident | null> {
  try {
    const res = await request(`incidents/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const idx = localIncidents.findIndex((i) => i.id === id);
  if (idx !== -1) {
    localIncidents[idx] = {
      ...localIncidents[idx],
      status,
      resolved_at: status === "RESOLVED" ? new Date().toISOString() : undefined,
    };
    return localIncidents[idx];
  }
  return null;
}

export async function regenerateIncidentDiagnosis(id: string): Promise<Incident | null> {
  try {
    const res = await request(`incidents/${encodeURIComponent(id)}/diagnose`, {
      method: "POST",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const idx = localIncidents.findIndex((i) => i.id === id);
  if (idx !== -1) {
    return localIncidents[idx];
  }
  return null;
}

export async function fetchServices(): Promise<Service[]> {
  try {
    const res = await request("services");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((s: any) => ({
          id: s.id,
          name: s.name || s.id,
          environment: s.environment || "production",
          status: s.status || "healthy",
          requests: s.requests || 12500,
          error_rate: s.error_rate ?? 0.4,
          latency_ms: s.latency_ms ?? 145,
          incident_count: s.incident_count ?? 0,
          last_activity: "Just now",
          api_key_hash: s.api_key || s.api_key_hash,
          created_at: s.created_at,
        }));
      }
    }
  } catch {
    // fallback to mock
  }
  return [...localServices];
}

export async function registerService(data: {
  id: string;
  name: string;
  environment: string;
}): Promise<Service> {
  const newService: Service = {
    id: data.id.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
    name: data.name,
    environment: data.environment,
    status: "healthy",
    requests: 0,
    error_rate: 0.0,
    latency_ms: 85,
    incident_count: 0,
    last_activity: "Registered now",
    api_key_hash: `at_live_${Math.random().toString(36).substring(2, 16)}`,
    created_at: new Date().toISOString(),
  };

  try {
    const res = await request("services", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      newService.api_key_hash = created.api_key || newService.api_key_hash;
    }
  } catch {
    // local fallback
  }

  localServices = [newService, ...localServices];
  return newService;
}

export async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const res = await request("stats");
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return {
    ...MOCK_SYSTEM_STATS,
    active_services_count: localServices.length,
    open_incidents_count: localIncidents.filter((i) => i.status === "OPEN").length,
  };
}

export async function fetchAdminInfrastructure(): Promise<InfrastructureStatus> {
  return {
    ...MOCK_INFRASTRUCTURE_STATUS,
  };
}

export async function fetchAdminUsers(): Promise<UserAccount[]> {
  return [...localUsers];
}

export async function createUser(user: Omit<UserAccount, "id" | "created_at">): Promise<UserAccount> {
  const created: UserAccount = {
    id: `usr-${Math.random().toString(36).substring(2, 7)}`,
    ...user,
    created_at: new Date().toISOString().split("T")[0],
  };
  localUsers = [created, ...localUsers];
  return created;
}

export async function deleteUser(id: string): Promise<boolean> {
  localUsers = localUsers.filter((u) => u.id !== id);
  return true;
}
