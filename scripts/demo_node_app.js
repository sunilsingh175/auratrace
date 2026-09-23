/**
 * AuraTrace Demo Node.js Application
 * Demonstrates zero-config auto-discovery, telemetry streaming, and automated exception capture.
 */

import { AuraTrace } from "../sdk/nodejs/dist/index.js";

const API_KEY = process.env.AURATRACE_API_KEY || "aura_secret_key_123";
const ENDPOINT = process.env.AURATRACE_ENDPOINT || "http://127.0.0.1:8000";

console.log("==================================================");
console.log("🚀 Starting Demo Node.js Microservice with AuraTrace");
console.log("==================================================");

// 1. Initialize AuraTrace with zero-config (serviceName is automatically detected if omitted)
AuraTrace.init({
  apiKey: API_KEY,
  endpoint: ENDPOINT,
  serviceName: "payment-gateway-node",
  version: "2.4.1",
  environment: "production",
});

const client = AuraTrace.getClient();
console.log(`✅ AuraTrace SDK Initialized!`);
console.log(`   • Service Name: ${client.serviceName}`);
console.log(`   • Runtime: node`);
console.log(`   • Version: ${client.version}`);
console.log(`   • Endpoint: ${ENDPOINT}`);
console.log(`   • Project Key: ${API_KEY.slice(0, 12)}...`);

async function runDemo() {
  console.log("\n📡 1. Emitting normal operational telemetry...");
  for (let i = 1; i <= 3; i++) {
    await AuraTrace.captureMessage(`Processed payment batch #${i} successfully`, {
      batch_id: `batch-${i}`,
      processed_count: 50,
      latency_ms: 45 + Math.floor(Math.random() * 20),
    });
    console.log(`   ✓ Streamed telemetry event #${i}`);
  }

  console.log("\n💥 2. Simulating critical exception (PostgreSQL Connection Pool Exhaustion)...");
  try {
    throw new Error(
      "ConnectionPoolExhaustedError: Timeout waiting for free connection in pool (max=20, timeout=5000ms)\n" +
      "    at Pool.acquireConnection (/app/services/database.js:84:19)\n" +
      "    at PaymentTransaction.execute (/app/controllers/payment.js:142:11)\n" +
      "    at processTicksAndRejections (node:internal/process/task_queues:95:5)"
    );
  } catch (err) {
    console.log("   ⚠️ Intercepted error. Dispatching to AuraTrace AI Doctor...");
    await AuraTrace.captureException(err, {
      route: "/api/v2/checkout/charge",
      method: "POST",
      customer_id: "cus_99182391",
      active_connections: 20,
      pool_max: 20,
    });
    console.log("   ✅ Error telemetry successfully dispatched to ingestion stream!");
  }

  // Allow transporter to flush queue
  console.log("\n⏳ Flushing batch queue...");
  await client.transporter.flush();
  console.log("✨ Demo Node.js run completed successfully!");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
