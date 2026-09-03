/**
 * AuraTrace Batch Transporter
 */

export interface TelemetryPayload {
  service_id: string;
  message?: string;
  error_type?: string;
  raw_stack_trace?: string;
  anomaly_score?: number;
  metadata?: Record<string, any>;
  level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  timestamp?: string;
}

export interface TransporterConfig {
  endpoint?: string;
  apiKey: string;
  serviceId: string;
}

export class BatchTransporter {
  private endpoint: string;
  private apiKey: string;
  private serviceId: string;

  constructor(config: TransporterConfig) {
    this.endpoint = (config.endpoint || "http://localhost:8000").replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.serviceId = config.serviceId;
  }

  async send(payload: Partial<TelemetryPayload>) {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/telemetry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify({
          service_id: this.serviceId,
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Telemetry ingestion failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("AuraTrace Transporter Error:", error);
      throw error;
    }
  }
}

