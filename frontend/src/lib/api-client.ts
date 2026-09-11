/** AuraTrace REST API client. Calls the Next.js server proxy so the master key stays server-side. */
const API_BASE_URL = "/api/aura";

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
  resolved_at?: string | null;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const [basePath, search] = path
    .replace(/^\//, "")
    .replace(/^api\/v1\//, "")
    .split("?");
  const searchParams = new URLSearchParams(search || "");
  searchParams.set("path", basePath);

  const res = await fetch(`${API_BASE_URL}?${searchParams.toString()}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  return res.json();
}

export async function fetchIncidents(params?: {
  status?: string;
  service_id?: string;
  limit?: number;
}): Promise<Incident[]> {
  try {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") {
      q.set("status_filter", params.status);
    }
    if (params?.service_id && params.service_id !== "ALL") {
      q.set("service_id", params.service_id);
    }
    if (params?.limit) {
      q.set("limit", String(params.limit));
    }
    return await request<Incident[]>(
      `incidents${q.toString() ? `?${q.toString()}` : ""}`
    );
  } catch {
    return [];
  }
}

export async function fetchIncidentById(id: string): Promise<Incident | null> {
  try {
    return await request<Incident>(
      `incidents/${encodeURIComponent(id)}`
    );
  } catch {
    return null;
  }
}

export async function updateIncidentStatus(
  id: string,
  status: Incident["status"]
): Promise<Incident | null> {
  try {
    return await request<Incident>(
      `incidents/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
  } catch {
    return null;
  }
}

export async function fetchSystemStats(): Promise<SystemStats> {
  try {
    return await request<SystemStats>("stats");
  } catch {
    return {
      total_logs_ingested: 0,
      ingestion_rate_per_sec: 0,
      error_rate_percent: 0,
      p95_latency_ms: 0,
      open_incidents_count: 0,
      active_services_count: 0,
    };
  }
}

export async function fetchServices(): Promise<ServiceItem[]> {
  try {
    return await request<ServiceItem[]>("services");
  } catch {
    return [];
  }
}

export async function registerService(data: {
  id: string;
  name: string;
  environment: string;
}): Promise<ServiceItem | null> {
  try {
    return await request<ServiceItem>("services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
}
