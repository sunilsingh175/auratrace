import { AuraTrace } from './index.js';

// Initialize AuraTrace SDK
AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY || process.env.AURA_MASTER_API_KEY || 'at_live_master_auratrace_2026',
  endpoint: process.env.AURATRACE_ENDPOINT || 'http://localhost:8000',
  serviceName: 'order-service',
});

async function runContinuousTest() {
  console.log("⚡ Starting continuous AuraTrace telemetry stream...");
  let count = 1;

  setInterval(async () => {
    try {
      const message = `Live telemetry event #${count++} from Node.js SDK`;
      await AuraTrace.captureMessage(message, { timestamp: new Date().toISOString() });
      console.log(`[AuraTrace SDK] Sent: ${message}`);
    } catch (error) {
      console.error("[AuraTrace SDK] Failed to send telemetry:", error);
    }
  }, 2000);
}

runContinuousTest();