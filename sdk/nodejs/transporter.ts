/**
 * AuraTrace Batch Transporter
 */

export interface TelemetryPayload {
  service_id: string;
  runtime?: string;
  environment?: string;
  version?: string;
  message?: string;
  error_type?: string;
  stack_trace?: string;
  raw_stack_trace?: string;
  anomaly_score?: number;
  latency_ms?: number;
  status_code?: number;
  metadata?: Record<string, any>;
  level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  timestamp?: string;
}

export interface TransporterConfig {
  endpoint?: string;
  apiKey: string;
  serviceId?: string;
  runtime?: string;
  environment?: string;
  version?: string;
}

export class BatchTransporter {
  private endpoint: string;
  private apiKey: string;
  private serviceId: string;
  private runtime: string;
  private environment: string;
  private version: string;

  constructor(config: TransporterConfig) {
    this.endpoint = (config.endpoint || process.env.AUTOTRACE_ENDPOINT || process.env.AURATRACE_ENDPOINT || "http://localhost:8000").replace(/\/$/, "");
    this.apiKey = config.apiKey || process.env.AUTOTRACE_API_KEY || process.env.AURATRACE_API_KEY || "";
    this.serviceId = config.serviceId || "node-app";
    this.runtime = config.runtime || "node";
    this.environment = config.environment || process.env.NODE_ENV || "production";
    this.version = config.version || "1.0.0";
  }

  async send(payload: Partial<TelemetryPayload>) {
    try {
      const fullPayload = {
        service_id: payload.service_id || this.serviceId,
        runtime: payload.runtime || this.runtime,
        environment: payload.environment || this.environment,
        version: payload.version || this.version,
        timestamp: payload.timestamp || new Date().toISOString(),
        ...payload,
      };

      const response = await fetch(`${this.endpoint}/api/v1/telemetry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
          "X-Project-Key": this.apiKey,
        },
        body: JSON.stringify(fullPayload),
      });

      if (!response.ok) {
        throw new Error(`AuraTrace telemetry ingestion failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Non-blocking console warning to avoid degrading primary host app
      console.warn("AuraTrace Transporter Dispatch Warning:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  async flush() {
    // Flush any pending promises or buffer
    return Promise.resolve();
  }
}
