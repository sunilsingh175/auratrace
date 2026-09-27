# 🔌 AuraTrace API Reference

Base URL: `http://localhost:8000` (Local) / `https://api.auratrace.dev` (Production)

---

## 🔑 Authentication

### 1. Ingestion Endpoints
Include the project API key via header:
```http
X-API-Key: aura_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Dashboard & Admin Endpoints
Include the JWT bearer token:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 📡 Endpoints

### `POST /v1/ingest`
Ingests a single telemetry or crash event into the stream buffer.

**Request Payload:**
```json
{
  "event_type": "crash",
  "service_name": "payment-service",
  "environment": "production",
  "error_type": "TypeError",
  "error_message": "Cannot read property 'amount' of undefined",
  "stack_trace": "at processPayment (src/payment.js:42:15)",
  "latency_ms": 3500.0,
  "runtime": {
    "language": "nodejs",
    "version": "20.10.0",
    "framework": "express"
  }
}
```

**Response (`202 Accepted`):**
```json
{
  "status": "accepted",
  "event_id": "1727340000000-0",
  "incident_signature": "a3f5b2c8e1d9f4a6"
}
```

---

### `POST /v1/ingest/batch`
Ingests up to 500 telemetry events in a single batch.

---

### `POST /v1/projects`
Provisions a new project and returns the high-entropy API key.

**Request Payload:**
```json
{
  "name": "ecommerce-backend",
  "owner_email": "dev@example.com"
}
```

**Response (`201 Created`):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "ecommerce-backend",
  "slug": "ecommerce-backend",
  "api_key": "aura_live_AbCdEf0123456789...",
  "api_key_prefix": "aura_live_AbCd",
  "warning": "Store this API key securely. It will not be shown again."
}
```

---

### `GET /v1/incidents?project_id=<id>&status=<status>`
Retrieves paginated incidents for a specific project.

---

### `GET /v1/incidents/{incident_id}`
Retrieves full incident diagnostics, including AI root-cause analysis, unified diff code patch, confidence score, and PR links.

---

### `GET /health`
System liveness check.

---

### `GET /health/detailed`
Deep health probe checking PostgreSQL query latency and Redis stream capacity.

---

### `GET /metrics`
Prometheus metrics exporter for ingestion rate, HTTP request duration, and incident count.
