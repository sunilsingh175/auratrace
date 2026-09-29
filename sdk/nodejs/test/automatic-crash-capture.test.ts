import assert from "node:assert/strict";
import { AuraTrace } from "../src/client.js";
import { uninstallGlobalHooks } from "../src/hooks.js";

async function testAutomaticCrashCapture() {
  console.log("Testing Node SDK automatic crash capture hooks...");
  uninstallGlobalHooks();

  let capturedEvent: any = null;
  const client = new AuraTrace({
    apiKey: "test_key_123",
    serviceName: "checkout-worker",
    installGlobalHandlers: true,
  });

  // Override transport enqueue
  client.transport.enqueue = (event: any) => {
    capturedEvent = event;
    return true;
  };

  // Simulate uncaught exception emit
  const testError = new TypeError("Cannot read property 'price' of undefined");
  process.emit("uncaughtException", testError);

  await new Promise((r) => setTimeout(r, 50));

  assert.ok(capturedEvent, "Event should have been captured by global hook");
  assert.equal(capturedEvent.service_name, "checkout-worker");
  assert.equal(capturedEvent.error_type, "TypeError");
  assert.equal(capturedEvent.error_message, "Cannot read property 'price' of undefined");
  assert.equal(capturedEvent.level, "CRITICAL");
  assert.equal(capturedEvent.metadata.hook, "uncaughtException");

  await client.close();
  console.log("✓ Automatic crash capture test passed.");
}

testAutomaticCrashCapture().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
