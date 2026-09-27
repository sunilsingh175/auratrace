import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { installHandlers, formatError } from './handlers';
import { detectRuntime, detectServiceName, detectEnvironment } from './runtime';
import { sanitize } from './sanitizer';

export interface InitOptions {
  apiKey?: string;
  endpoint?: string;
  serviceName?: string;
  environment?: string;
  autoCapture?: boolean;
  batchSize?: number;
  flushIntervalMs?: number;
  timeoutMs?: number;
}

export class AuraTraceClient {
  private apiKey: string;
  private endpoint: string;
  private serviceName: string;
  private environment: string;
  private runtime: any;
  private batchSize: number;
  private flushIntervalMs: number;
  private timeoutMs: number;

  private queue: any[] = [];
  private timer: NodeJS.Timeout | null = null;
  private enabled: boolean;

  constructor(opts: InitOptions) {
    this.enabled = process.env.AURATRACE_DISABLED !== '1';

    this.apiKey = opts.apiKey || process.env.AURATRACE_API_KEY || '';
    if (!this.apiKey && this.enabled) {
      throw new Error(
        'Missing API key. Pass apiKey or set AURATRACE_API_KEY env var.'
      );
    }

    this.endpoint = (
      opts.endpoint ||
      process.env.AURATRACE_ENDPOINT ||
      'http://localhost:8000'
    ).replace(/\/$/, '');

    this.serviceName = opts.serviceName || detectServiceName();
    this.environment = opts.environment || detectEnvironment();
    this.runtime = detectRuntime();

    this.batchSize = opts.batchSize ?? 20;
    this.flushIntervalMs = opts.flushIntervalMs ?? 3000;
    this.timeoutMs = opts.timeoutMs ?? 5000;

    if (this.enabled) {
      this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
      this.timer.unref?.();

      if (opts.autoCapture !== false) {
        installHandlers((err) => this.captureException(err));
      }

      // Flush on exit
      process.on('beforeExit', () => this.flush());
      process.on('exit', () => this.flush());
    }
  }

  // ── Public ────────────────────────────────────────────

  captureException(err: Error, extra: Record<string, any> = {}): void {
    if (!this.enabled) return;
    const payload = {
      event_type: 'crash',
      timestamp: new Date().toISOString(),
      service_name: this.serviceName,
      environment: this.environment,
      error_type: err.name || 'Error',
      error_message: (err.message || '').slice(0, 1000),
      stack_trace: formatError(err).slice(0, 20000),
      runtime: this.runtime,
      sdk_name: '@auratrace/node',
      sdk_version: '1.0.0',
      ...extra,
    };
    this.enqueue(payload);
  }

  captureEvent(eventType: string, data: Record<string, any> = {}): void {
    if (!this.enabled) return;
    this.enqueue({
      event_type: eventType,
      timestamp: new Date().toISOString(),
      service_name: this.serviceName,
      environment: this.environment,
      runtime: this.runtime,
      sdk_name: '@auratrace/node',
      sdk_version: '1.0.0',
      ...data,
    });
  }

  flush(): void {
    if (!this.enabled || this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.batchSize);
    this.send(batch);
  }

  // ── Internals ─────────────────────────────────────────

  private enqueue(payload: any): void {
    try {
      if (this.queue.length >= 5000) return; // drop
      this.queue.push(sanitize(payload));
    } catch {
      // silent
    }
  }

  private send(batch: any[]): void {
    const isBatch = batch.length > 1;
    const url = `${this.endpoint}/v1/ingest${isBatch ? '/batch' : ''}`;
    const body = JSON.stringify(isBatch ? batch : batch[0]);
    const u = new URL(url);

    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.timeoutMs,
      },
      () => {} // ignore response
    );
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.write(body);
    req.end();
  }
}

// ── Module-level singleton ───────────────────────────────
let _client: AuraTraceClient | null = null;

export function init(opts: InitOptions): AuraTraceClient {
  _client = new AuraTraceClient(opts);
  return _client;
}

export function getClient(): AuraTraceClient | null {
  return _client;
}

export function captureException(err: Error, extra?: Record<string, any>): void {
  _client?.captureException(err, extra);
}

export function captureEvent(eventType: string, data?: Record<string, any>): void {
  _client?.captureEvent(eventType, data);
}
