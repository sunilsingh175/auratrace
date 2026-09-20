export type Role = "user" | "admin";

export type Severity = "critical" | "high" | "medium" | "low";

export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export type ServiceStatus = "healthy" | "warning" | "critical";

export interface Service {
  id: string;
  name: string;
  environment: string;
  status: ServiceStatus;
  requests: number;
  error_rate: number;
  latency_ms: number;
  incident_count: number;
  last_activity?: string;
  api_key_hash?: string;
  created_at?: string;
}

export interface SystemMetrics {
  cpu_percent: number;
  memory_percent: number;
  latency_ms: number;
  error_rate_per_min: number;
}

export interface SimilarIncident {
  id: string;
  title: string;
  service_id: string;
  similarity_score: number;
  fix_summary: string;
  resolved_time?: string;
}

export interface Incident {
  id: string;
  service_id: string;
  title: string;
  error_type: string;
  severity: Severity;
  status: IncidentStatus;
  anomaly_score: number;
  created_at: string;
  resolved_at?: string;
  raw_log?: string;
  stack_trace?: string;
  system_metrics?: SystemMetrics;
  similar_incidents?: SimilarIncident[];
  ai_root_cause?: string;
  ai_recommended_fix?: string;
  code_diff?: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  service_id: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SystemStats {
  total_logs_ingested: number;
  ingestion_rate_per_sec: number;
  error_rate_percent: number;
  p95_latency_ms: number;
  open_incidents_count: number;
  active_services_count: number;
}

export interface InfrastructureStatus {
  api_status: "healthy" | "degraded" | "offline";
  api_latency_ms?: number;
  redis_status: "healthy" | "degraded" | "offline";
  redis_stream_length?: number;
  redis_memory_used?: string;
  postgres_status: "healthy" | "degraded" | "offline";
  postgres_connections?: number;
  postgres_vector_indexes?: number;
  ml_worker_status: "healthy" | "degraded" | "offline" | "unknown";
  ml_queue_rate?: number;
  ml_contamination?: number;
  rag_doctor_status: "healthy" | "degraded" | "offline" | "unknown";
  embedding_latency_ms?: number;
  llm_latency_ms?: number;
  active_ws_clients?: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "Developer" | "Admin" | "Viewer";
  status: "Active" | "Suspended" | "Pending";
  created_at: string;
  avatar_url?: string;
}

export interface PerformanceDataPoint {
  time: string;
  latency: number;
  errors: number;
  requests: number;
}

export interface AnomalyHeatmapDay {
  day: string;
  hours: number[]; // 24 values (0 to 10 scale of anomalies)
}
