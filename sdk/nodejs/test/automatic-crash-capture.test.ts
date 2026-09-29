import assert from "node:assert/strict";
import test from "node:test";
import { AuraTrace, AuraTraceClient } from "../index.js";

test("package import installs an uncaught exception handler", () => {
  assert.ok(
    process.listenerCount("uncaughtException") > 0,
    "AuraTrace should install an uncaughtException handler on import",
  );
  assert.ok(
    process.listenerCount("unhandledRejection") > 0,
    "AuraTrace should install an unhandledRejection handler on import",
  );
});

test("client captures exceptions without requiring network access", async () => {
  const client = new AuraTraceClient({
    apiKey: "test-key",
    endpoint: "http://127.0.0.1:9",
    serviceName: "sdk-test",
    environment: "test",
    installGlobalHandlers: false,
  });

  const payloads: unknown[] = [];
  client.transporter.send = async (payload) => {
    payloads.push(payload);
    return { accepted: true };
  };

  await client.captureException(new Error("synthetic failure"), {
    status_code: 500,
  });

  assert.equal(payloads.length, 1);
  const payload = payloads[0] as Record<string, unknown>;
  assert.equal(payload.error_type, "Error");
  assert.equal(payload.message, "synthetic failure");
  assert.equal(payload.status_code, 500);
  assert.equal(payload.service_id, "sdk-test");
});

test("default client remains available for explicit APIs", async () => {
  const client = AuraTrace.getClient();
  assert.ok(client instanceof AuraTraceClient);

  const payloads: unknown[] = [];
  client.transporter.send = async (payload) => {
    payloads.push(payload);
    return { accepted: true };
  };

  await AuraTrace.captureMessage("sdk smoke test", { level: "INFO" });

  assert.equal(payloads.length, 1);
  assert.equal((payloads[0] as Record<string, unknown>).message, "sdk smoke test");
});
