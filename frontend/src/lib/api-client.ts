const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Incident {
  id: string;
  service_id: string;
  anomaly_score: number;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  error_type?: string;
  raw_stack_trace: string;
  ai_root_cause?: string;
  ai_suggested_patch?: string;
  created_at: string;
  resolved_at?: string;
}

export interface SystemStats {
  total_logs_ingested: number;
  ingestion_rate_per_sec: number;
  error_rate_percent: number;
  p95_latency_ms: number;
  open_incidents_count: number;
  active_services_count: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  api_key: string;
  environment: string;
  created_at: string;
}

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  return fetch(path.startsWith("http") ? path : `${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}

export async function fetchIncidents(params?: { status?: string; service_id?: string; limit?: number }): Promise<Incident[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.set("status_filter", params.status);
    if (params?.service_id) query.set("service_id", params.service_id);
    if (params?.limit) query.set("limit", String(params.limit));
    const res = await request(`/api/v1/incidents?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return [];
  }
}

export async function fetchIncidentById(id: string): Promise<Incident | null> {
  try {
    const res = await request(`/api/v1/incidents/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch incident ${id}:`, error);
    return null;
  }
}

export async function updateIncidentStatus(id: string, status: "OPEN" | "INVESTIGATING" | "RESOLVED"): Promise<Incident | null> {
  try {
    const res = await request(`/api/v1/incidents/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to update incident status:", error);
    return null;
  }
}

export async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const res = await request("/api/v1/stats");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { total_logs_ingested: 0, ingestion_rate_per_sec: 0, error_rate_percent: 0, p95_latency_ms: 0, open_incidents_count: 0, active_services_count: 0 };
  }
}

export async function fetchServices(): Promise<ServiceItem[]> {
  try {
    const res = await request("/api/v1/services");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function registerService(data: { id: string; name: string; environment: string }): Promise<ServiceItem | null> {
  try {
    const res = await request("/api/v1/services", { method: "POST", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to register service:", error);
    return null;
  }
}
