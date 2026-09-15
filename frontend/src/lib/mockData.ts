import {
  Incident,
  Service,
  TelemetryLog,
  SystemStats,
  InfrastructureStatus,
  UserAccount,
  PerformanceDataPoint,
  AnomalyHeatmapDay,
} from "@/types";

export const MOCK_SERVICES: Service[] = [
  {
    id: "payment-api",
    name: "Payment API Service",
    environment: "production",
    status: "critical",
    requests: 14250,
    error_rate: 8.4,
    latency_ms: 2840,
    incident_count: 3,
    last_activity: "Just now",
    api_key_hash: "at_live_948f102a48bc9e7104d",
    created_at: "2026-08-15T09:00:00Z",
  },
  {
    id: "auth-service",
    name: "Authentication & Identity",
    environment: "production",
    status: "healthy",
    requests: 28900,
    error_rate: 0.2,
    latency_ms: 120,
    incident_count: 0,
    last_activity: "Just now",
    api_key_hash: "at_live_837b291c94ee23f8101",
    created_at: "2026-08-12T14:30:00Z",
  },
  {
    id: "notification-worker",
    name: "Async Notification Dispatcher",
    environment: "production",
    status: "warning",
    requests: 9400,
    error_rate: 3.8,
    latency_ms: 780,
    incident_count: 1,
    last_activity: "2m ago",
    api_key_hash: "at_live_109c84fa21dd89aa334",
    created_at: "2026-08-20T11:15:00Z",
  },
  {
    id: "order-service",
    name: "Order Processing Engine",
    environment: "production",
    status: "healthy",
    requests: 18200,
    error_rate: 0.6,
    latency_ms: 210,
    incident_count: 0,
    last_activity: "Just now",
    api_key_hash: "at_live_382a99fb74ec49db201",
    created_at: "2026-08-10T08:00:00Z",
  },
  {
    id: "inventory-service",
    name: "Realtime Inventory Sync",
    environment: "staging",
    status: "healthy",
    requests: 4120,
    error_rate: 0.1,
    latency_ms: 95,
    incident_count: 0,
    last_activity: "1m ago",
    api_key_hash: "at_live_671d93aa54ab18cc502",
    created_at: "2026-09-01T16:45:00Z",
  },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: "INC-1024",
    service_id: "payment-api",
    title: "Database Connection Pool Exhaustion",
    error_type: "sqlalchemy.exc.TimeoutError",
    severity: "critical",
    status: "OPEN",
    anomaly_score: 0.94,
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    raw_log:
      '{"level": "ERROR", "service": "payment-api", "error": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00"}',
    stack_trace: `Traceback (most recent call last):
  File "/app/services/checkout.py", line 142, in process_transaction
    db_session = engine.connect()
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/pool/base.py", line 378, in connect
    return _ConnectionFairy._checkout(self)
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/pool/base.py", line 1020, in _checkout
    fairy = self._pool.get(self._timeout)
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/pool/impl.py", line 149, in get
    raise exc.TimeoutError(
sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00`,
    system_metrics: {
      cpu_percent: 78,
      memory_percent: 92,
      latency_ms: 2840,
      error_rate_per_min: 34,
    },
    similar_incidents: [
      {
        id: "INC-0982",
        title: "Database connection leak in transaction loop",
        service_id: "payment-api",
        similarity_score: 0.96,
        fix_summary: "Replaced raw engine.connect() with Session context manager to ensure automatic connection return on exceptions.",
        resolved_time: "2026-08-14 16:30",
      },
      {
        id: "INC-0841",
        title: "PostgreSQL pool starvation during flash sale",
        service_id: "order-service",
        similarity_score: 0.89,
        fix_summary: "Increased QueuePool max_overflow to 25 and tuned pool_recycle to 1800s.",
        resolved_time: "2026-07-28 11:10",
      },
      {
        id: "INC-0719",
        title: "Dangling asyncpg connection handles in refund webhook",
        service_id: "payment-api",
        similarity_score: 0.83,
        fix_summary: "Added finally block with explicit connection.close() release in webhook handler.",
        resolved_time: "2026-06-19 09:45",
      },
    ],
    ai_root_cause:
      "High incoming transaction concurrency caused persistent database connection exhaustion. In `process_transaction()`, raw DB connection handles were acquired without a guaranteed context manager or `try...finally` block. When downstream payment gateway calls timed out, the connection handles were left in limbo and never returned to the SQLAlchemy QueuePool.",
    ai_recommended_fix:
      "1. Refactor connection handling to use `with Session(engine) as session:` or `with engine.connect() as conn:` context managers.\n2. Add an explicit timeout to the external HTTP gateway calls so DB sessions do not wait indefinitely.\n3. Increase PostgreSQL `pool_size` from 10 to 25 and configure `pool_timeout=10.0`.",
    code_diff: `--- a/services/checkout.py
+++ b/services/checkout.py
@@ -140,8 +140,8 @@ def process_transaction(user_id: str, amount: float):
-    db_session = engine.connect()
-    record = db_session.execute(insert(Transaction).values(user=user_id, amount=amount))
+    with engine.begin() as conn:
+        record = conn.execute(insert(Transaction).values(user=user_id, amount=amount))
-    payment_gateway.charge(user_id, amount)
+        payment_gateway.charge(user_id, amount, timeout=5.0)
-    db_session.close()`,
  },
  {
    id: "INC-1023",
    service_id: "notification-worker",
    title: "Redis Stream Consumer Lag Spike",
    error_type: "redis.exceptions.ConnectionError",
    severity: "high",
    status: "OPEN",
    anomaly_score: 0.87,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    raw_log:
      '{"level": "ERROR", "service": "notification-worker", "error": "redis.exceptions.ConnectionError: Error 111 connecting to redis-broker:6379. Connection refused"}',
    stack_trace: `Traceback (most recent call last):
  File "/app/workers/notification.py", line 89, in consume_stream
    messages = r.xreadgroup("workers", "worker-1", {STREAM_KEY: ">"}, count=50, block=2000)
  File "/usr/local/lib/python3.11/site-packages/redis/client.py", line 984, in execute_command
    return conn.read_response()
redis.exceptions.ConnectionError: Error 111 connecting to redis-broker:6379. Connection refused.`,
    system_metrics: {
      cpu_percent: 64,
      memory_percent: 71,
      latency_ms: 780,
      error_rate_per_min: 18,
    },
    similar_incidents: [
      {
        id: "INC-0912",
        title: "Redis broker socket disconnect on high buffer",
        service_id: "notification-worker",
        similarity_score: 0.91,
        fix_summary: "Configured exponential backoff retry connection pool for redis-py.",
        resolved_time: "2026-08-02 14:15",
      },
    ],
    ai_root_cause:
      "Worker connection pool disconnected during Redis transient socket reload. The subscriber lacked automatic reconnection backoff logic.",
    ai_recommended_fix:
      "Wrap Redis xreadgroup with a `Retry(ExponentialBackoff(cap=5))` retry policy and keepalive socket options.",
    code_diff: `--- a/workers/notification.py
+++ b/workers/notification.py
@@ -45,3 +45,5 @@
-r = redis.Redis(host=REDIS_HOST, port=6379)
+retry_policy = Retry(ExponentialBackoff(cap=5), retries=3)
+r = redis.Redis(host=REDIS_HOST, port=6379, retry=retry_policy, retry_on_error=[ConnectionError, TimeoutError])`,
  },
  {
    id: "INC-1022",
    service_id: "auth-service",
    title: "JWT Token Cache Memory Leak",
    error_type: "MemoryError / GC Thrash",
    severity: "medium",
    status: "RESOLVED",
    anomaly_score: 0.79,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    raw_log:
      '{"level": "WARN", "service": "auth-service", "message": "High memory consumption: 88% allocated in in-memory LRU"}',
    stack_trace: `RuntimeWarning: In-memory cache exceeded max item threshold (100,000 items)
  File "/app/auth/jwt_validator.py", line 52, in cache_public_key
    PUBLIC_KEY_CACHE[kid] = pem_data`,
    system_metrics: {
      cpu_percent: 42,
      memory_percent: 48,
      latency_ms: 120,
      error_rate_per_min: 1,
    },
    similar_incidents: [
      {
        id: "INC-0650",
        title: "Unbounded in-memory dictionary cache in JWT verification",
        service_id: "auth-service",
        similarity_score: 0.94,
        fix_summary: "Replaced plain dict with TTLCache(maxsize=1000, ttl=3600).",
        resolved_time: "2026-05-10 18:20",
      },
    ],
    ai_root_cause:
      "Unbounded dictionary keys accumulation on rotated JWT keys caused memory pressure.",
    ai_recommended_fix:
      "Adopt a bounded cache `cachetools.TTLCache` with size cap and 1-hour eviction.",
    code_diff: `--- a/auth/jwt_validator.py
+++ b/auth/jwt_validator.py
@@ -12,2 +12,3 @@
-PUBLIC_KEY_CACHE = {}
+from cachetools import TTLCache
+PUBLIC_KEY_CACHE = TTLCache(maxsize=500, ttl=3600)`,
  },
  {
    id: "INC-1021",
    service_id: "order-service",
    title: "Payment Webhook Socket Timeout Cascade",
    error_type: "httpx.ReadTimeout",
    severity: "critical",
    status: "RESOLVED",
    anomaly_score: 0.91,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
  },
  {
    id: "INC-1020",
    service_id: "auth-service",
    title: "Signature Verification Rate Limit Burst",
    error_type: "RateLimitExceeded",
    severity: "low",
    status: "RESOLVED",
    anomaly_score: 0.65,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 47 * 3600 * 1000).toISOString(),
  },
];

export const MOCK_PERFORMANCE_METRICS: PerformanceDataPoint[] = [
  { time: "10:00", latency: 195, errors: 2, requests: 1200 },
  { time: "10:05", latency: 210, errors: 3, requests: 1350 },
  { time: "10:10", latency: 245, errors: 4, requests: 1420 },
  { time: "10:15", latency: 230, errors: 2, requests: 1380 },
  { time: "10:20", latency: 310, errors: 7, requests: 1550 },
  { time: "10:25", latency: 450, errors: 12, requests: 1800 },
  { time: "10:30", latency: 680, errors: 18, requests: 2100 },
  { time: "10:35", latency: 1200, errors: 25, requests: 2450 },
  { time: "10:40", latency: 2840, errors: 34, requests: 2900 },
  { time: "10:45", latency: 2650, errors: 31, requests: 2820 },
  { time: "10:50", latency: 1820, errors: 19, requests: 2300 },
  { time: "10:55", latency: 850, errors: 9, requests: 1950 },
];
export const MOCK_PERFORMANCE_DATA = MOCK_PERFORMANCE_METRICS;

export const MOCK_TELEMETRY_LOGS: TelemetryLog[] = [
  { id: "log-1", timestamp: "10:42:01.102", level: "INFO", service_id: "payment-api", message: "HTTP POST /api/v1/checkout - payload validated (user_id=usr_8392)" },
  { id: "log-2", timestamp: "10:42:01.320", level: "INFO", service_id: "auth-service", message: "JWT token verified successfully (algorithm=RS256, exp=3600s)" },
  { id: "log-3", timestamp: "10:42:01.455", level: "INFO", service_id: "order-service", message: "Order state initialized: ORDER_PENDING (order_id=ord_91820)" },
  { id: "log-4", timestamp: "10:42:02.012", level: "WARN", service_id: "payment-api", message: "Database connection pool utilization exceeded threshold: 92% active" },
  { id: "log-5", timestamp: "10:42:02.408", level: "WARN", service_id: "payment-api", message: "Acquiring connection handle queued: wait_time=4200ms" },
  { id: "log-6", timestamp: "10:42:03.119", level: "ERROR", service_id: "payment-api", message: "QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00" },
  { id: "log-7", timestamp: "10:42:03.125", level: "ERROR", service_id: "payment-api", message: "sqlalchemy.exc.TimeoutError in process_transaction (checkout.py:142)" },
  { id: "log-8", timestamp: "10:42:03.501", level: "WARN", service_id: "notification-worker", message: "Failed to dispatch payment_failed webhook: connection refused" },
  { id: "log-9", timestamp: "10:42:04.019", level: "INFO", service_id: "inventory-service", message: "Heartbeat check passed: replica lag 2ms" },
  { id: "log-10", timestamp: "10:42:04.312", level: "INFO", service_id: "auth-service", message: "Session refreshed for sunil@auratrace.io" },
];

export const MOCK_SYSTEM_STATS: SystemStats = {
  total_logs_ingested: 482910,
  ingestion_rate_per_sec: 1420,
  error_rate_percent: 2.4,
  p95_latency_ms: 284,
  open_incidents_count: 2,
  active_services_count: 5,
};

export const MOCK_INFRASTRUCTURE_STATUS: InfrastructureStatus = {
  api_status: "healthy",
  api_latency_ms: 18,
  redis_status: "healthy",
  redis_stream_length: 42910,
  redis_memory_used: "18.4 MB",
  postgres_status: "healthy",
  postgres_connections: 28,
  postgres_vector_indexes: 4,
  ml_worker_status: "healthy",
  ml_queue_rate: 1420,
  ml_contamination: 0.05,
  rag_doctor_status: "healthy",
  embedding_latency_ms: 42,
  llm_latency_ms: 680,
  active_ws_clients: 8,
};

export const MOCK_USERS: UserAccount[] = [
  { id: "usr-01", name: "Sunil Rajput", email: "sunil@auratrace.io", role: "Admin", status: "Active", created_at: "2026-08-01" },
  { id: "usr-02", name: "Sarah Jenkins", email: "sarah.j@auratrace.io", role: "Developer", status: "Active", created_at: "2026-08-05" },
  { id: "usr-03", name: "Alex Chen", email: "alex.c@auratrace.io", role: "Developer", status: "Active", created_at: "2026-08-10" },
  { id: "usr-04", name: "DevOps Bot", email: "bot@auratrace.internal", role: "Viewer", status: "Active", created_at: "2026-08-15" },
  { id: "usr-05", name: "Elena Rostova", email: "elena.r@auratrace.io", role: "Developer", status: "Suspended", created_at: "2026-08-20" },
];

export const MOCK_HEATMAP_DATA: AnomalyHeatmapDay[] = [
  { day: "Mon", hours: [0, 0, 1, 0, 0, 0, 2, 4, 6, 8, 5, 3, 2, 4, 7, 5, 3, 2, 1, 0, 0, 0, 0, 0] },
  { day: "Tue", hours: [0, 0, 0, 0, 0, 1, 3, 5, 7, 6, 4, 2, 3, 5, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0] },
  { day: "Wed", hours: [0, 1, 0, 0, 0, 0, 2, 6, 9, 8, 4, 3, 2, 6, 9, 7, 4, 2, 1, 0, 0, 0, 0, 0] },
  { day: "Thu", hours: [0, 0, 0, 0, 0, 2, 4, 7, 8, 9, 6, 4, 3, 7, 10, 8, 5, 3, 1, 0, 0, 0, 0, 0] },
  { day: "Fri", hours: [0, 0, 1, 0, 0, 1, 3, 6, 8, 7, 5, 3, 4, 8, 9, 6, 4, 2, 1, 0, 0, 0, 0, 0] },
  { day: "Sat", hours: [0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 1, 2, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Sun", hours: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
];
