export type Role = "Developer" | "Admin" | "Viewer";

export type Severity = "critical" | "high" | "medium" | "low";

export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export type ServiceStatus = "healthy" | "warning" | "critical" | "active" | "inactive" | "degraded";

export interface Project {
  id: string;
  name: string;
  api_key?: string;
  created_at: string;
  service_count?: number;
}

export interface Service {
  id: string;
  project_id?: string;
  service_id?: string;
  name: string;
  runtime?: "node" | "python" | "go" | "java" | string;
  environment: string;
  version?: string;
  status: ServiceStatus;
  requests: number;
  error_rate: number;
  latency_ms: number;
  incident_count: number;
  first_seen_at?: string;
  last_seen_at?: string;
  last_activity?: string;
  created_at?: string;
  owner_id?: string;
}

export interface ServiceRegistrationResponse extends Service {
  api_key: string;
  message?: string;
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
  is_diagnosed?: boolean;
  ai_root_cause?: string;
  ai_recommended_fix?: string;
  ai_suggested_patch?: string;
  code_diff?: string;
  source?: "sdk" | "simulation" | string;
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
  total_incidents_count?: number;
  ingestion_rate_per_sec: number;
  error_rate_percent: number;
  p95_latency_ms: number;
  open_incidents_count: number;
  active_services_count: number;
}

export interface InfrastructureStatus {
  api_status: "healthy" | "degraded" | "offline" | "unknown";
  api_latency_ms?: number;
  redis_status: "healthy" | "degraded" | "offline" | "unknown";
  redis_stream_length?: number;
  redis_memory_used?: string | null;
  postgres_status: "healthy" | "degraded" | "offline" | "unknown";
  postgres_connections?: number;
  // Three distinct pgvector concepts:
  embedding_dimension?: number;        // model constant (384 for bge-small-en-v1.5)
  vector_index_count?: number;         // actual IVFFlat/HNSW indexes in pg_indexes
  indexed_knowledge_records?: number;  // rows in historical_fixes with embeddings
  ml_worker_status: "healthy" | "degraded" | "offline" | "unknown";
  ml_entries_processed?: number;       // cumulative stream entries read by consumer group
  ml_contamination?: number;
  rag_doctor_status: "healthy" | "degraded" | "offline" | "unknown";
  // These are not measured at health-check time; backend returns null
  embedding_latency_ms?: number | null;
  llm_latency_ms?: number | null;
  active_ws_clients?: number;
  anomaly_threshold?: number;
  anomaly_window_seconds?: number;
  embedding_model?: string;
  llm_model?: string;
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
