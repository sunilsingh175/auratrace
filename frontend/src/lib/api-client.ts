import {
  Incident,
  Service,
  SystemStats,
  InfrastructureStatus,
  UserAccount,
} from "@/types";
import {
  MOCK_INFRASTRUCTURE_STATUS,
  MOCK_USERS,
} from "./mockData";

export * from "@/types";
export type ServiceItem = Service;

const API_BASE_URL = "/api/aura";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE_URL}?path=${encodeURIComponent(path.replace(/^\//, ""))}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}

let localUsers: UserAccount[] = [...MOCK_USERS];

function ensureOk(response: Response, path: string) {
  if (!response.ok) throw new Error(`AuraTrace API ${response.status} for ${path}`);
}

export async function fetchIncidents(params?: {
  status?: string;
  service_id?: string;
  limit?: number;
}): Promise<Incident[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.set("status_filter", params.status);
  if (params?.service_id) query.set("service_id", params.service_id);
  if (params?.limit) query.set("limit", String(params.limit));
  const path = `incidents?${query}`;
  const res = await request(path);
  ensureOk(res, path);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid incidents response");
  return data.map((item: any) => ({
    id: item.id,
    service_id: item.service_id || "unknown",
    title: item.title || item.error_type || "Anomaly Detected",
    error_type: item.error_type || "System Anomaly",
    severity: item.severity || (item.anomaly_score > 0.85 ? "critical" : item.anomaly_score > 0.7 ? "high" : "medium"),
    status: item.status || "OPEN",
    anomaly_score: typeof item.anomaly_score === "number" ? item.anomaly_score : 0,
    created_at: item.created_at || new Date().toISOString(),
    resolved_at: item.resolved_at,
    stack_trace: item.stack_trace || item.raw_stack_trace,
    ai_root_cause: item.ai_root_cause,
    ai_recommended_fix: item.ai_suggested_patch || item.ai_recommended_fix,
    code_diff: item.code_diff || item.ai_suggested_patch,
    system_metrics: item.system_metrics,
    similar_incidents: item.similar_incidents,
  }));
}

export async function fetchIncidentById(id: string): Promise<Incident | null> {
  const path = `incidents/${encodeURIComponent(id)}`;
  const res = await request(path);
  if (res.status === 404) return null;
  ensureOk(res, path);
  const item = await res.json();
  if (!item?.id) return null;
  return {
    id: item.id,
    service_id: item.service_id || "unknown",
    title: item.title || item.error_type || "Anomaly Detected",
    error_type: item.error_type || "System Anomaly",
    severity: item.severity || (item.anomaly_score > 0.85 ? "critical" : "high"),
    status: item.status || "OPEN",
    anomaly_score: typeof item.anomaly_score === "number" ? item.anomaly_score : 0,
    created_at: item.created_at || new Date().toISOString(),
    resolved_at: item.resolved_at,
    stack_trace: item.stack_trace || item.raw_stack_trace,
    ai_root_cause: item.ai_root_cause,
    ai_recommended_fix: item.ai_suggested_patch || item.ai_recommended_fix,
    code_diff: item.code_diff || item.ai_suggested_patch,
    system_metrics: item.system_metrics,
    similar_incidents: item.similar_incidents,
  };
}

export async function updateIncidentStatus(id: string, status: "OPEN" | "INVESTIGATING" | "RESOLVED"): Promise<Incident | null> {
  const path = `incidents/${encodeURIComponent(id)}/status`;
  const res = await request(path, { method: "PATCH", body: JSON.stringify({ status }) });
  ensureOk(res, path);
  return await res.json();
}

export async function regenerateIncidentDiagnosis(id: string): Promise<Incident | null> {
  const path = `incidents/${encodeURIComponent(id)}/diagnose`;
  const res = await request(path, { method: "POST" });
  ensureOk(res, path);
  return await res.json();
}

export async function fetchServices(): Promise<Service[]> {
  const path = "services";
  const res = await request(path);
  ensureOk(res, path);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid services response");
  return data.map((s: any) => ({
    id: s.id,
    name: s.name || s.id,
    environment: s.environment || "production",
    status: s.status || "healthy",
    requests: Number(s.requests ?? 0),
    error_rate: Number(s.error_rate ?? 0),
    latency_ms: Number(s.latency_ms ?? 0),
    incident_count: Number(s.incident_count ?? 0),
    last_activity: s.last_activity || undefined,
    api_key_hash: s.api_key,
    created_at: s.created_at,
  }));
}

export async function registerService(data: { id: string; name: string; environment: string }): Promise<Service> {
  const path = "services";
  const res = await request(path, { method: "POST", body: JSON.stringify(data) });
  ensureOk(res, path);
  const created = await res.json();
  return {
    id: created.id || data.id,
    name: created.name || data.name,
    environment: created.environment || data.environment,
    status: created.status || "healthy",
    requests: Number(created.requests ?? 0),
    error_rate: Number(created.error_rate ?? 0),
    latency_ms: Number(created.latency_ms ?? 0),
    incident_count: Number(created.incident_count ?? 0),
    last_activity: created.last_activity || undefined,
    api_key_hash: created.api_key,
    created_at: created.created_at,
  };
}

export async function simulateCrash(
  serviceId: string,
  scenario: string = "db_pool_exhaustion"
): Promise<any> {
  const path = "simulate-crash";
  const res = await request(path, {
    method: "POST",
    body: JSON.stringify({
      service_id: serviceId,
      scenario,
    }),
  });
  ensureOk(res, path);
  return res.json();
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const path = "stats";
  const res = await request(path);
  ensureOk(res, path);
  const data = await res.json();
  if (!data || typeof data !== "object") throw new Error("Invalid system stats response");
  return {
    total_logs_ingested: Number(data.total_logs_ingested ?? 0),
    ingestion_rate_per_sec: Number(data.ingestion_rate_per_sec ?? data.events_per_sec ?? 0),
    error_rate_percent: Number(data.error_rate_percent ?? (typeof data.error_ratio === "number" ? data.error_ratio * 100 : 0)),
    p95_latency_ms: Number(data.p95_latency_ms ?? 0),
    open_incidents_count: Number(data.open_incidents_count ?? 0),
    active_services_count: Number(data.active_services_count ?? 0),
  };
}

export interface PerformanceTimeSeriesPoint {
  time: string;
  requests: number;
  latency: number;
  p95_latency: number;
  errors: number;
  error_rate: number;
}

export async function fetchPerformanceTimeseries(
  windowSeconds = 300,
  bucketSeconds = 5
): Promise<PerformanceTimeSeriesPoint[]> {
  const path = `stats/timeseries?window_seconds=${windowSeconds}&bucket_seconds=${bucketSeconds}`;
  try {
    const res = await request(path);
    ensureOk(res, path);
    const data = await res.json();
    return Array.isArray(data?.points) ? data.points : [];
  } catch (err) {
    console.warn("Failed to fetch performance time series:", err);
    return [];
  }
}

export async function fetchAdminInfrastructure(): Promise<InfrastructureStatus> {
  return { ...MOCK_INFRASTRUCTURE_STATUS };
}

export async function fetchAdminUsers(): Promise<UserAccount[]> {
  return [...localUsers];
}

export async function createUser(user: Omit<UserAccount, "id" | "created_at">): Promise<UserAccount> {
  const created = { id: `usr-${Math.random().toString(36).substring(2, 7)}`, ...user, created_at: new Date().toISOString().split("T")[0] };
  localUsers = [created, ...localUsers];
  return created;
}

export async function deleteUser(id: string): Promise<boolean> {
  localUsers = localUsers.filter((u) => u.id !== id);
  return true;
}
