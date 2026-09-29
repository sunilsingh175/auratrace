/**
 * AuraTrace Node.js SDK HTTP Transport
 */

export interface TelemetryEvent {
  service_id: string;
  service_name: string;
  level: string;
  message: string;
  error_type?: string;
  error_message?: string;
  stack_trace?: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface TransportOptions {
  endpoint: string;
  apiKey: string;
  batchSize?: number;
  flushIntervalMs?: number;
}

export class HTTPTransport {
  public endpoint: string;
  public apiKey: string;
  public batchSize: number;
  public flushIntervalMs: number;

  private queue: TelemetryEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(options: TransportOptions) {
    this.endpoint = options.endpoint.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.batchSize = Math.max(1, options.batchSize || 50);
    this.flushIntervalMs = Math.max(100, options.flushIntervalMs || 1000);

    this.startFlusherTimer();
  }

  public enqueue(event: TelemetryEvent): boolean {
    if (this.isShuttingDown) return false;
    if (this.queue.length >= 10000) {
      this.queue.shift(); // Drop oldest
    }
    this.queue.push(event);

    if (this.queue.length >= this.batchSize) {
      void this.flush();
    }
    return true;
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0 || !this.apiKey) return;

    const batch = this.queue.splice(0, this.batchSize);
    await this.sendBatch(batch);
  }

  public async sendBatch(batch: TelemetryEvent[]): Promise<boolean> {
    if (!batch.length || !this.apiKey) return false;

    const url = `${this.endpoint}/api/v1/telemetry/batch`;
    const body = JSON.stringify({ events: batch });

    try {
      if (typeof fetch === "function") {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey,
            "X-Project-Key": this.apiKey,
          },
          body,
        });
        return res.ok;
      }
    } catch {
      // Fail silent
    }
    return false;
  }

  private startFlusherTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
