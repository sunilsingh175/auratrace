/**
 * AutoTrace Demo Node.js Application
 * Demonstrates zero-config auto-discovery, telemetry streaming, and automated exception capture.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AutoTrace } from "../sdk/nodejs/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if available
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const API_KEY =
  process.env.AUTOTRACE_API_KEY ||
  process.env.AURATRACE_API_KEY ||
  process.env.AURA_MASTER_API_KEY;
if (!API_KEY) {
  console.error(
    "❌ Error: AUTOTRACE_API_KEY or AURATRACE_API_KEY environment variable is required."
  );
  process.exit(1);
}

const ENDPOINT =
  process.env.AUTOTRACE_ENDPOINT ||
  process.env.AURATRACE_ENDPOINT ||
  "http://127.0.0.1:8000";

console.log("==================================================");
console.log("🚀 Starting Demo Node.js Microservice with AutoTrace");
console.log("==================================================");

// 1. Initialize AutoTrace with zero-config (serviceName is automatically detected if omitted)
AutoTrace.init({
  apiKey: API_KEY,
  endpoint: ENDPOINT,
  serviceName: "payment-gateway-node",
  version: "2.4.1",
  environment: "production",
});

const client = AutoTrace.getClient();
console.log(`✅ AutoTrace SDK Initialized!`);
console.log(`   • Service Name: ${client.serviceName}`);
console.log(`   • Runtime: node`);
console.log(`   • Version: ${client.version}`);
console.log(`   • Endpoint: ${ENDPOINT}`);
console.log(`   • Project Key: ${API_KEY.slice(0, 12)}...`);

async function runDemo() {
  console.log("\n📡 1. Emitting normal operational telemetry...");
  for (let i = 1; i <= 3; i++) {
    await AutoTrace.captureMessage(`Processed payment batch #${i} successfully`, {
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
    console.log("   ⚠️ Intercepted error. Dispatching to AutoTrace AI Doctor...");
    await AutoTrace.captureException(err, {
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
