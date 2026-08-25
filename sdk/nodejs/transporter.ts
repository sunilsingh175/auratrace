/**
 * AuraTrace Node.js HTTP Transporter
 * Non-blocking event buffering and batch dispatch.
 */

export interface TelemetryPayload {
  service_id: string;
  timestamp?: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  latency_ms?: number;
  error_type?: string;
  message?: string;
  stack_trace?: string;
  metadata?: Record<string, any>;
}

export class BatchTransporter {
  private queue: TelemetryPayload[] = [];
  private timer: NodeJS.Timeout | null = null;
  private endpoint: string;
  private apiKey: string;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor(endpoint: string, apiKey: string, batchSize: number = 50, flushIntervalMs: number = 1000) {
    this.endpoint = endpoint.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.startTimer();
  }

  public enqueue(item: TelemetryPayload) {
    if (this.queue.length >= 10000) {
      this.queue.shift(); // Drop oldest under backpressure
    }
    this.queue.push({
      ...item,
      timestamp: item.timestamp || new Date().toISOString(),
    });

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  public async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      await fetch(`${this.endpoint}/api/v1/telemetry/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Fail silently to avoid breaking the main application thread
    }
  }
}
