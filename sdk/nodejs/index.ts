/**
 * AuraTrace Node.js SDK
 */

import { BatchTransporter, type TransporterConfig, type TelemetryPayload } from "./transporter.ts";

export class AuraTrace {
  private transporter: BatchTransporter;

  constructor(config: TransporterConfig) {
    this.transporter = new BatchTransporter({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      serviceId: config.serviceId,
    });
  }

  async captureMessage(message: string, metadata?: Record<string, any>) {
    return await this.transporter.send({
      message,
      metadata,
    });
  }

  async captureException(error: Error, metadata?: Record<string, any>) {
    return await this.transporter.send({
      error_type: error.name,
      raw_stack_trace: error.stack,
      message: error.message,
      metadata,
    });
  }
}

export { BatchTransporter, type TransporterConfig, type TelemetryPayload };