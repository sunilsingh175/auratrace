import {
  Incident,
  Service,
  Project,
  ServiceRegistrationResponse,
  SystemStats,
  InfrastructureStatus,
  UserAccount,
} from "@/types";

export * from "@/types";
export type ServiceItem = Service;

const API_BASE_URL = "/api/aura";

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("trace_access_token_v1");
    if (token) headers.set("Authorization", "Bearer " + token);
  }
  return fetch(`${API_BASE_URL}?path=${encodeURIComponent(path.replace(/^\//, ""))}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}

function ensureOk(response: Response, path: string) {
  if (!response.ok) throw new Error(`Trace API ${response.status} for ${path}`);
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
  try {
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
  } catch (err) {
    console.warn("Failed to fetch incident by id:", err);
    return null;
  }
}

export async function updateIncidentStatus(id: string, status: "OPEN" | "INVESTIGATING" | "RESOLVED"): Promise<Incident | null> {
  try {
    const path = `incidents/${encodeURIComponent(id)}/status`;
    const res = await request(path, { method: "PATCH", body: JSON.stringify({ status }) });
    ensureOk(res, path);
    return await res.json();
  } catch (err) {
    console.warn("Failed to update incident status:", err);
    return null;
  }
}

export async function regenerateIncidentDiagnosis(id: string): Promise<Incident | null> {
  try {
    const path = `incidents/${encodeURIComponent(id)}/diagnose`;
    const res = await request(path, { method: "POST" });
    ensureOk(res, path);
    return await res.json();
  } catch (err) {
    console.warn("Failed to regenerate incident diagnosis:", err);
    return null;
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const path = "projects";
  const res = await request(path);
  ensureOk(res, path);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((p: any) => {
    const cachedKey = typeof window !== "undefined" ? localStorage.getItem(`auratrace_key_${p.id}`) : null;
    return {
      id: p.id,
      name: p.name,
      api_key:
        p.api_key ||
        cachedKey ||
        (p.id === "00000000-0000-0000-0000-000000000001"
          ? "at_live_master_auratrace_2026"
          : `at_live_${p.id.replace(/-/g, "").slice(0, 24)}`),
      created_at: p.created_at || new Date().toISOString(),
      service_count: Number(p.service_count ?? 0),
    };
  });
}

export async function createProject(data: { name: string }): Promise<Project> {
  const path = "projects";
  const res = await request(path, { method: "POST", body: JSON.stringify(data) });
  ensureOk(res, path);
  const project = await res.json();
  if (project?.id && project?.api_key && typeof window !== "undefined") {
    localStorage.setItem(`auratrace_key_${project.id}`, project.api_key);
  }
  return project;
}

export async function regenerateProjectKey(projectId: string): Promise<{ id: string; name: string; api_key: string }> {
  const path = `projects/${encodeURIComponent(projectId)}/regenerate-key`;
  const res = await request(path, { method: "POST" });
  ensureOk(res, path);
  return res.json();
}

export async function fetchServices(): Promise<Service[]> {
  const path = "services";
  const res = await request(path);
  ensureOk(res, path);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid services response");
  return data.map((s: any) => ({
    id: s.id,
    project_id: s.project_id || undefined,
    service_id: s.service_id || s.name || s.id,
    name: s.name || s.id,
    runtime: s.runtime || "node",
    environment: s.environment || "production",
    version: s.version || "1.0.0",
    status: s.status || "healthy",
    requests: Number(s.requests ?? 0),
    error_rate: Number(s.error_rate ?? 0),
    latency_ms: Number(s.latency_ms ?? 0),
    incident_count: Number(s.incident_count ?? 0),
    first_seen_at: s.first_seen_at || undefined,
    last_seen_at: s.last_seen_at || s.last_activity || undefined,
    last_activity: s.last_activity || s.last_seen_at || undefined,
    created_at: s.created_at,
    owner_id: s.owner_id || undefined,
  }));
}

export async function registerService(data: { id: string; name: string; environment: string }): Promise<ServiceRegistrationResponse> {
  const path = "services";
  const res = await request(path, { method: "POST", body: JSON.stringify(data) });
  ensureOk(res, path);
  const created = await res.json();
  return {
    id: created.id || data.id,
    project_id: created.project_id || undefined,
    service_id: created.service_id || data.id,
    name: created.name || data.name,
    runtime: created.runtime || "node",
    version: created.version || "1.0.0",
    environment: created.environment || data.environment,
    status: created.status || "healthy",
    requests: Number(created.requests ?? 0),
    error_rate: Number(created.error_rate ?? 0),
    latency_ms: Number(created.latency_ms ?? 0),
    incident_count: Number(created.incident_count ?? 0),
    last_activity: created.last_activity || undefined,
    api_key: created.api_key || "",
    message: created.message,
    created_at: created.created_at,
    owner_id: created.owner_id || undefined,
  };
}

export async function updateService(
  serviceId: string,
  data: { name?: string; description?: string; environment?: string; status?: string }
): Promise<Service> {
  const path = `services/${encodeURIComponent(serviceId)}`;
  const res = await request(path, { method: "PATCH", body: JSON.stringify(data) });
  ensureOk(res, path);
  return res.json();
}

export async function deleteService(serviceId: string): Promise<{ success: boolean; message: string }> {
  const path = `services/${encodeURIComponent(serviceId)}`;
  const res = await request(path, { method: "DELETE" });
  ensureOk(res, path);
  return res.json();
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
  const path = "health";
  const res = await request(path);
  ensureOk(res, path);
  const data = await res.json();
  return {
    api_status: data.api_status || data.status || "unknown",
    api_latency_ms: data.api_latency_ms,
    redis_status: data.redis_status || "unknown",
    redis_stream_length: data.redis_stream_length,
    redis_memory_used: data.redis_memory_used,
    postgres_status: data.postgres_status || "unknown",
    postgres_connections: data.postgres_connections,
    // Three distinct pgvector concepts returned by the backend:
    embedding_dimension: data.embedding_dimension,        // model constant (384 for bge-small-en-v1.5)
    vector_index_count: data.vector_index_count,          // actual IVFFlat/HNSW indexes in pg_indexes
    indexed_knowledge_records: data.indexed_knowledge_records, // rows in historical_fixes with embeddings
    ml_worker_status: data.ml_worker_status || "unknown",
    ml_entries_processed: data.ml_entries_processed,     // cumulative stream entries read by consumer group
    ml_contamination: data.ml_contamination,
    rag_doctor_status: data.rag_doctor_status || "unknown",
    embedding_latency_ms: data.embedding_latency_ms,
    llm_latency_ms: data.llm_latency_ms,
    active_ws_clients: data.active_ws_clients,
    anomaly_threshold: data.anomaly_threshold,
    anomaly_window_seconds: data.anomaly_window_seconds,
    embedding_model: data.embedding_model,
    llm_model: data.llm_model,
  } as InfrastructureStatus;
}

export async function fetchAdminUsers(): Promise<UserAccount[]> {
  const path = "auth/users";
  const res = await request(path);
  ensureOk(res, path);
  return await res.json();
}

export async function updateUserStatus(id: string, status: "Active" | "Suspended"): Promise<UserAccount> {
  const path = `auth/users/${encodeURIComponent(id)}/status`;
  const res = await request(path, { method: "PATCH", body: JSON.stringify({ status }) });
  ensureOk(res, path);
  return await res.json();
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; message: string; id: string }> {
  const path = `auth/users/${encodeURIComponent(id)}`;
  const res = await request(path, { method: "DELETE" });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.detail || `Failed to delete user (${res.status})`);
  }
  return await res.json();
}

export async function fetchUserDetails(id: string): Promise<UserAccount> {
  const path = `auth/users/${encodeURIComponent(id)}`;
  const res = await request(path);
  ensureOk(res, path);
  return await res.json();
}

export async function updateUserProfile(data: { name: string }): Promise<{ user: UserAccount; message: string }> {
  const path = "auth/profile";
  const res = await request(path, { method: "PATCH", body: JSON.stringify(data) });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.detail || `Failed to update profile (${res.status})`);
  }
  return await res.json();
}

export async function changeUserPassword(data: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> {
  const path = "auth/change-password";
  const res = await request(path, { method: "POST", body: JSON.stringify(data) });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.detail || `Failed to change password (${res.status})`);
  }
  return await res.json();
}