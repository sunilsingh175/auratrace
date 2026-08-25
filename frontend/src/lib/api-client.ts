/**
 * AuraTrace REST API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MASTER_API_KEY = "aura_secret_key_123";

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

export async function fetchIncidents(params?: {
  status?: string;
  service_id?: string;
  limit?: number;
}): Promise<Incident[]> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/incidents`);
    if (params?.status) url.searchParams.append("status", params.status);
    if (params?.service_id) url.searchParams.append("service_id", params.service_id);
    if (params?.limit) url.searchParams.append("limit", params.limit.toString());

    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": MASTER_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return [];
  }
}

export async function fetchIncidentById(id: string): Promise<Incident | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/incidents/${id}`, {
      headers: { "X-API-Key": MASTER_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch incident ${id}:`, error);
    return null;
  }
}

export async function updateIncidentStatus(
  id: string,
  status: "OPEN" | "INVESTIGATING" | "RESOLVED"
): Promise<Incident | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/incidents/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MASTER_API_KEY,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Status update failed ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Failed to update incident status:`, error);
    return null;
  }
}

export async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/stats`, {
      headers: { "X-API-Key": MASTER_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (error) {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/services`, {
      headers: { "X-API-Key": MASTER_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
}

export async function registerService(data: {
  id: string;
  name: string;
  environment: string;
}): Promise<ServiceItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/services`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MASTER_API_KEY,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Registration failed`);
    return await res.json();
  } catch (error) {
    console.error("Failed to register service:", error);
    return null;
  }
}
