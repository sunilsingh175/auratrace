const { AuraTrace } = require("@auratrace/node");

// Initialize AuraTrace SDK for an anomaly scenario
AuraTrace.init({
  apiKey: "at_live_master_auratrace_2026",
  endpoint: "http://localhost:8000",
  serviceName: "payment-gateway",
  environment: "production",
});

async function simulateIncident() {
  console.log("🚀 Emitting abnormal traffic spike & exception cascade to trigger ML Anomaly Detection...");

  const endpoints = ["/api/v1/payments/charge", "/api/v1/checkout/session", "/api/v1/cards/verify"];
  
  // Phase 1: High latency & status 503 / 500 cascade
  for (let i = 1; i <= 15; i++) {
    const route = endpoints[i % endpoints.length];
    const isError = i % 2 === 0;
    const latency = isError ? 2450 + Math.random() * 1500 : 85 + Math.random() * 40;

    if (isError) {
      const dbError = new Error(`ConnectionPoolTimeout: Timeout of 5000ms exceeded acquiring client connection for query at ${route}`);
      dbError.name = "DatabaseConnectionPoolExhaustion";
      
      const res = await AuraTrace.captureException(dbError, {
        route,
        status_code: 503,
        latency_ms: latency,
        pool_active_connections: 50,
        pool_max_connections: 50,
        pool_waiting_requests: 120 + i * 5,
        source: "sdk-anomaly-tester"
      });
      console.log(`[Event ${i}/15] Ingested 503 Error cascade: ${res?.event_id || 'ok'}`);
    } else {
      const res = await AuraTrace.captureMessage(`High latency detected on ${route}`, {
        route,
        status_code: 200,
        latency_ms: latency,
        source: "sdk-anomaly-tester"
      });
      console.log(`[Event ${i}/15] Ingested Latency warning: ${res?.event_id || 'ok'}`);
    }

    // Small delay between telemetry packets
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\n✅ Telemetry burst sent to Redis Stream!");
  console.log("👀 Check AuraTrace Dashboard & ML Worker logs for Anomaly score, Incident creation, and AI/RAG Root Cause Diagnosis.");
}

simulateIncident();
