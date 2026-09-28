import { AuraTrace } from './index.js';

async function runSdkTest() {
  console.log("Initializing AuraTrace Node.js SDK...");
  const client = AuraTrace.init({
    apiKey: process.env.AURATRACE_API_KEY || 'at_test_local_key',
    endpoint: process.env.AURATRACE_ENDPOINT || 'http://localhost:8000',
    serviceName: 'order-service',
    environment: 'test',
  });

  console.log("Client initialized for service:", client.serviceName);

  console.log("Testing captureMessage...");
  await AuraTrace.captureMessage("Order dispatched for user_99", {
    order_id: "ord_1002",
    amount: 149.50,
  });

  console.log("Testing captureException...");
  try {
    throw new Error("SyntheticPaymentGatewayTimeout: Connection timed out after 3000ms");
  } catch (error: any) {
    await AuraTrace.captureException(error, {
      route: "/api/v1/orders/checkout",
      status_code: 504,
    });
  }

  console.log("Node.js SDK test finished successfully!");
  process.exit(0);
}

runSdkTest().catch((err) => {
  console.error("Node.js SDK test failed:", err);
  process.exit(1);
});