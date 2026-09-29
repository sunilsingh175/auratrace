import assert from "node:assert/strict";
import { HTTPTransport } from "../src/transport.js";

async function testTransport() {
  console.log("Testing AuraTrace Node HTTP transport...");

  const transport = new HTTPTransport({
    endpoint: "http://localhost:8000",
    apiKey: "test_key",
    batchSize: 2,
    flushIntervalMs: 500,
  });

  let sentBatches: any[] = [];
  transport.sendBatch = async (batch: any[]) => {
    sentBatches.push(batch);
    return true;
  };

  transport.enqueue({
    service_id: "test",
    service_name: "test",
    level: "INFO",
    message: "msg-1",
    timestamp: new Date().toISOString(),
    metadata: {},
  });

  transport.enqueue({
    service_id: "test",
    service_name: "test",
    level: "INFO",
    message: "msg-2",
    timestamp: new Date().toISOString(),
    metadata: {},
  });

  await transport.flush();
  assert.equal(sentBatches.length, 1);
  assert.equal(sentBatches[0].length, 2);
  assert.equal(sentBatches[0][0].message, "msg-1");
  assert.equal(sentBatches[0][1].message, "msg-2");

  await transport.shutdown();
  console.log("✓ Transport tests passed.");
}

testTransport().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
