/**
 * AuraTrace Node.js SDK — Zero-Boilerplate Automatic Crash Detection & Diagnostics
 */

import {
  AuraTrace,
  AuraTraceClient,
  AutoTrace,
  Trace,
  type AuraTraceInitOptions,
  type AutoTraceInitOptions,
} from "./client.js";
import { installGlobalHooks, uninstallGlobalHooks } from "./hooks.js";
import { getRuntimeMetadata } from "./metadata.js";
import { HTTPTransport, type TelemetryEvent } from "./transport.js";

let defaultClient: AuraTrace | null = null;

export function init(options: AuraTraceInitOptions = {}): AuraTrace {
  defaultClient = new AuraTrace(options);
  return defaultClient;
}

function getOrCreateClient(): AuraTrace {
  if (!defaultClient) {
    defaultClient = new AuraTrace();
  }
  return defaultClient;
}

export function captureMessage(
  message: string,
  metadata: Record<string, any> = {},
  severity: string = "info"
): Promise<void> {
  return getOrCreateClient().captureMessage(message, metadata, severity);
}

export function captureException(
  error: Error | any,
  metadata: Record<string, any> = {},
  severity: string = "critical"
): Promise<void> {
  return getOrCreateClient().captureException(error, metadata, severity);
}

export function flush(): Promise<void> {
  if (defaultClient) {
    return defaultClient.flush();
  }
  return Promise.resolve();
}

// Auto-bootstrap client on module load
try {
  getOrCreateClient();
} catch {
  // Fail silent during auto-initialization
}

export {
  AuraTrace,
  AuraTraceClient,
  AutoTrace,
  Trace,
  HTTPTransport,
  installGlobalHooks,
  uninstallGlobalHooks,
  getRuntimeMetadata,
  type AuraTraceInitOptions,
  type AutoTraceInitOptions,
  type TelemetryEvent,
};

export default {
  init,
  captureMessage,
  captureException,
  flush,
  AuraTrace,
  AuraTraceClient,
};
