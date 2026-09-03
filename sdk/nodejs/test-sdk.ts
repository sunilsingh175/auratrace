import { AuraTrace } from './index.ts';

const tracer = new AuraTrace({
  apiKey: 'aura_secret_key_123',
  endpoint: 'http://localhost:8000',
  serviceId: 'test-node-service'
});

async function runContinuousTest() {
  console.log("Starting continuous telemetry stream...");
  let count = 1;

  setInterval(async () => {
    try {
      const message = `Live telemetry event #${count++} from Node.js SDK`;
      await tracer.captureMessage(message, { timestamp: new Date().toISOString() });
      console.log(`Sent: ${message}`);
    } catch (error) {
      console.error("Failed to send telemetry:", error);
    }
  }, 2000); // Sends an event every 2 seconds
}

runContinuousTest();