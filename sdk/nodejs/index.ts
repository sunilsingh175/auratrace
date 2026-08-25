/**
 * Official AuraTrace Node.js SDK
 */

import { BatchTransporter, TelemetryPayload } from "./transporter";

export interface AuraTraceOptions {
  serviceId: string;
  apiKey: string;
  endpoint?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  captureUnhandledErrors?: boolean;
}

export class AuraTrace {
  public serviceId: string;
  private transporter: BatchTransporter;

  constructor(options: AuraTraceOptions) {
    this.serviceId = options.serviceId;
    this.transporter = new BatchTransporter(
      options.endpoint || "http://localhost:8000",
      options.apiKey,
      options.batchSize || 50,
      options.flushIntervalMs || 1000
    );

    if (options.captureUnhandledErrors !== false) {
      this.installGlobalHandlers();
    }
  }

  public log(level: TelemetryPayload["level"], message: string, options?: Partial<TelemetryPayload>) {
    this.transporter.enqueue({
      service_id: this.serviceId,
      level,
      message,
      latency_ms: options?.latency_ms || 0,
      error_type: options?.error_type,
      stack_trace: options?.stack_trace,
      metadata: options?.metadata,
    });
  }

  public info(message: string, latencyMs: number = 0, metadata?: Record<string, any>) {
    this.log("INFO", message, { latency_ms: latencyMs, metadata });
  }

  public warn(message: string, latencyMs: number = 0, metadata?: Record<string, any>) {
    this.log("WARN", message, { latency_ms: latencyMs, metadata });
  }

  public error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log("ERROR", message, {
      error_type: error?.name || "Error",
      stack_trace: error?.stack,
      metadata,
    });
  }

  public captureException(error: Error, message?: string, metadata?: Record<string, any>) {
    this.log("ERROR", message || error.message, {
      error_type: error.name || "UnhandledError",
      stack_trace: error.stack,
      metadata,
    });
  }

  /**
   * Express.js error handling middleware:
   * app.use(aura.expressErrorHandler());
   */
  public expressErrorHandler() {
    return (err: any, req: any, res: any, next: any) => {
      this.captureException(err, `Unhandled Express Route Error: ${req.method} ${req.url}`, {
        url: req.url,
        method: req.method,
      });
      next(err);
    };
  }

  private installGlobalHandlers() {
    if (typeof process !== "undefined") {
      process.on("uncaughtException", (error: Error) => {
        this.log("CRITICAL", `Uncaught Exception: ${error.message}`, {
          error_type: error.name,
          stack_trace: error.stack,
        });
      });

      process.on("unhandledRejection", (reason: any) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.log("CRITICAL", `Unhandled Rejection: ${error.message}`, {
          error_type: "UnhandledPromiseRejection",
          stack_trace: error.stack,
        });
      });
    }
  }
}

export default AuraTrace;
