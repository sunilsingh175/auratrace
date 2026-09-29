/**
 * AuraTrace Node.js SDK Client
 */

import { installGlobalHooks, uninstallGlobalHooks } from "./hooks.js";
import {
  getRuntimeMetadata,
  resolveApiKey,
  resolveEndpoint,
  resolveEnvironment,
  resolveServiceName,
  type RuntimeMetadata,
} from "./metadata.js";
import { HTTPTransport, type TelemetryEvent } from "./transport.js";

export interface AuraTraceInitOptions {
  apiKey?: string;
  projectKey?: string;
  endpoint?: string;
  serviceName?: string;
  serviceId?: string;
  environment?: string;
  version?: string;
  installGlobalHandlers?: boolean;
}

export type AutoTraceInitOptions = AuraTraceInitOptions;

export class AuraTrace {
  public serviceName: string;
  public environment: string;
  public version: string;
  public apiKey: string;
  public endpoint: string;
  public runtimeInfo: RuntimeMetadata;
  public transport: HTTPTransport;

  constructor(options: AuraTraceInitOptions = {}) {
    this.serviceName = resolveServiceName(options.serviceName || options.serviceId);
    this.environment = resolveEnvironment(options.environment);
    this.version = options.version || "1.0.0";
    this.apiKey = resolveApiKey(options.apiKey || options.projectKey);
    this.endpoint = resolveEndpoint(options.endpoint);
    this.runtimeInfo = getRuntimeMetadata();

    this.transport = new HTTPTransport({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
    });

    if (options.installGlobalHandlers !== false) {
      installGlobalHooks(this);
    }
  }

  public async captureMessage(
    message: string,
    metadata: Record<string, any> = {},
    severity: string = "info"
  ): Promise<void> {
    const event: TelemetryEvent = {
      service_id: this.serviceName,
      service_name: this.serviceName,
      level: severity.toUpperCase(),
      message: String(message),
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        environment: this.environment,
        version: this.version,
        ...this.runtimeInfo,
      },
    };
    this.transport.enqueue(event);
  }

  public async captureException(
    error: Error | any,
    metadata: Record<string, any> = {},
    severity: string = "critical"
  ): Promise<void> {
    const isErrorInstance = error instanceof Error;
    const errorType = isErrorInstance ? error.name : "Error";
    const errorMessage = isErrorInstance ? error.message : String(error);
    const stackTrace = isErrorInstance && error.stack ? error.stack : new Error().stack || "";

    const event: TelemetryEvent = {
      service_id: this.serviceName,
      service_name: this.serviceName,
      level: severity === "critical" ? "CRITICAL" : "ERROR",
      message: `${errorType}: ${errorMessage}`,
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        exception_type: errorType,
        environment: this.environment,
        version: this.version,
        ...this.runtimeInfo,
      },
    };
    this.transport.enqueue(event);
  }

  public async flush(): Promise<void> {
    await this.transport.flush();
  }

  public async close(): Promise<void> {
    uninstallGlobalHooks();
    await this.transport.shutdown();
  }
}

// Backward compatibility alias
export const AuraTraceClient = AuraTrace;
export type AuraTraceClient = AuraTrace;
export const AutoTrace = AuraTrace;
export const Trace = AuraTrace;
