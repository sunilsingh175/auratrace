/**
 * AuraTrace Node.js SDK — public API.
 */

import {
  AuraTrace,
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
  error: Error | unknown,
  metadata: Record<string, any> = {},
  severity: string = "critical"
): Promise<void> {
  return getOrCreateClient().captureException(error, metadata, severity);
}

export function flush(): Promise<void> {
  return defaultClient ? defaultClient.flush() : Promise.resolve();
}

export {
  AuraTrace,
  AuraTraceClient,
  AutoTrace,
  Trace,
} from "./client.js";
export type { AuraTraceInitOptions, AutoTraceInitOptions } from "./client.js";
export { HTTPTransport, type TelemetryEvent } from "./transport.js";
export { installGlobalHooks, uninstallGlobalHooks } from "./hooks.js";
export { getRuntimeMetadata } from "./metadata.js";

import { AuraTraceClient, AutoTrace, Trace } from "./client.js";

export default {
  init,
  captureMessage,
  captureException,
  flush,
  AuraTrace,
  AuraTraceClient,
  AutoTrace,
  Trace,
};
