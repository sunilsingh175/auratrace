import assert from "node:assert/strict";
import { AuraTrace } from "../src/client.js";

async function testClient() {
  console.log("Testing AuraTrace Node client instance...");

  const client = new AuraTrace({
    apiKey: "at_test_key_node_99",
    serviceName: "payment-api",
    environment: "staging",
    installGlobalHandlers: false,
  });

  assert.equal(client.apiKey, "at_test_key_node_99");
  assert.equal(client.serviceName, "payment-api");
  assert.equal(client.environment, "staging");
  assert.equal(client.runtimeInfo.language, "nodejs");

  let captured: any = null;
  client.transport.enqueue = (event: any) => {
    captured = event;
    return true;
  };

  await client.captureMessage("Payment authorized", { amount: 150 });
  assert.ok(captured);
  assert.equal(captured.message, "Payment authorized");
  assert.equal(captured.level, "INFO");
  assert.equal(captured.metadata.amount, 150);

  await client.captureException(new Error("Database timeout"));
  assert.ok(captured);
  assert.equal(captured.error_type, "Error");
  assert.equal(captured.error_message, "Database timeout");
  assert.equal(captured.level, "CRITICAL");

  await client.close();
  console.log("✓ Client unit tests passed.");
}

testClient().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
