/**
 * AuraTrace Node.js SDK
 * Zero-configuration telemetry, automatic service discovery, and AI root cause capture.
 */

import fs from "node:fs";
import path from "node:path";
import { BatchTransporter, type TransporterConfig, type TelemetryPayload } from "./transporter.js";

export interface AutoTraceInitOptions {
  apiKey?: string;
  endpoint?: string;
  serviceName?: string;
  environment?: string;
  version?: string;
  installGlobalHandlers?: boolean;
}

export type AuraTraceInitOptions = AutoTraceInitOptions;

function autoDetectServiceMetadata(): { serviceName: string; version: string; environment: string } {
  let serviceName =
    process.env.AUTOTRACE_SERVICE_NAME ||
    process.env.AURATRACE_SERVICE_NAME ||
    process.env.SERVICE_NAME ||
    process.env.npm_package_name ||
    "";
  let version = process.env.npm_package_version || "1.0.0";
  const environment = process.env.NODE_ENV || "production";

  if (!serviceName) {
    try {
      const pkgPath = path.resolve(process.cwd(), "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name) serviceName = pkg.name.replace(/^@[\w-]+\//, "");
        if (pkg.version) version = pkg.version;
      }
    } catch {
      // Fallback
    }
  }

  if (!serviceName) {
    serviceName = path.basename(process.cwd()) || "node-service";
  }

  return { serviceName, version, environment };
}

export class AutoTraceClient {
  public transporter: BatchTransporter;
  public serviceName: string;
  public environment: string;
  public version: string;

  constructor(options: AutoTraceInitOptions = {}) {
    const detected = autoDetectServiceMetadata();
    this.serviceName = options.serviceName || detected.serviceName;
    this.environment = options.environment || detected.environment;
    this.version = options.version || detected.version;

    const apiKey = options.apiKey || process.env.AUTOTRACE_API_KEY || process.env.AURATRACE_API_KEY || "";
    const endpoint = options.endpoint || process.env.AUTOTRACE_ENDPOINT || process.env.AURATRACE_ENDPOINT || "http://localhost:8000";

    this.transporter = new BatchTransporter({
      apiKey,
      endpoint,
      serviceId: this.serviceName,
      runtime: "node",
      environment: this.environment,
      version: this.version,
    });

    if (options.installGlobalHandlers !== false) {
      this.installGlobalErrorHandlers();
    }
  }

  private installGlobalErrorHandlers() {
    if (typeof process !== "undefined" && process.on) {
      process.on("uncaughtException", (error: Error) => {
        void this.captureException(error, { unhandled: true, mechanism: "uncaughtException" });
      });

      process.on("unhandledRejection", (reason: any) => {
        const err = reason instanceof Error ? reason : new Error(String(reason));
        void this.captureException(err, { unhandled: true, mechanism: "unhandledRejection" });
      });
    }
  }

  async captureMessage(message: string, metadata?: Record<string, any>) {
    return await this.transporter.send({
      message,
      level: "INFO",
      metadata,
    });
  }

  async captureException(error: Error, metadata?: Record<string, any>) {
    return await this.transporter.send({
      level: "ERROR",
      error_type: error.name || "Error",
      message: error.message || "Unhandled exception",
      stack_trace: error.stack || "",
      raw_stack_trace: error.stack || "",
      status_code: 500,
      metadata,
    });
  }

  /**
   * Express / Connect middleware for automatic error capture & telemetry
   */
  errorHandler() {
    return (err: any, req: any, res: any, next: any) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      void this.captureException(errorObj, {
        method: req?.method,
        url: req?.originalUrl || req?.url,
        headers: req?.headers,
        ip: req?.ip,
      });
      next(err);
    };
  }

  /**
   * Express / Connect middleware to trace latency & status codes
   */
  requestHandler() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        if (res.statusCode >= 400) {
          void this.transporter.send({
            level: res.statusCode >= 500 ? "ERROR" : "WARN",
            message: `${req.method} ${req.originalUrl || req.url} -> ${res.statusCode}`,
            status_code: res.statusCode,
            latency_ms: duration,
            metadata: {
              route: req.route?.path || req.url,
              method: req.method,
            },
          });
        }
      });
      next();
    };
  }
}

// Global Singleton Instance
let defaultClient: AutoTraceClient | null = null;

export const AutoTrace = {
  init(options: AutoTraceInitOptions = {}): AutoTraceClient {
    defaultClient = new AutoTraceClient(options);
    return defaultClient;
  },

  captureMessage(message: string, metadata?: Record<string, any>) {
    if (!defaultClient) AutoTrace.init();
    return defaultClient!.captureMessage(message, metadata);
  },

  captureException(error: Error, metadata?: Record<string, any>) {
    if (!defaultClient) AutoTrace.init();
    return defaultClient!.captureException(error, metadata);
  },

  errorHandler() {
    if (!defaultClient) AutoTrace.init();
    return defaultClient!.errorHandler();
  },

  requestHandler() {
    if (!defaultClient) AutoTrace.init();
    return defaultClient!.requestHandler();
  },

  getClient(): AutoTraceClient {
    if (!defaultClient) AutoTrace.init();
    return defaultClient!;
  },
};

// Aliases for backward compatibility
export const AuraTrace = AutoTrace;
export const AuraTraceClient = AutoTraceClient;
export const Trace = AutoTrace;
export const AutomaticBackendDetection = AutoTrace;

export { BatchTransporter, type TransporterConfig, type TelemetryPayload };