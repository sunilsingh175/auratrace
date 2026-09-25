const { AuraTrace } = require("@auratrace/node");

async function test() {
  console.log("Initializing AuraTrace client...");
  const client = AuraTrace.init({
    apiKey: "at_live_master_auratrace_2026",
    endpoint: "http://localhost:8000",
    serviceName: "sdk-test-service",
    environment: "development",
  });

  console.log("Client initialized successfully for service:", client.serviceName);

  console.log("Testing captureMessage...");
  const msgResult = await AuraTrace.captureMessage("Test log from sdk-test app", {
    test_run: true,
    foo: "bar",
  });
  console.log("captureMessage result:", msgResult);

  console.log("Testing captureException...");
  try {
    throw new Error("Synthetic database connection timeout");
  } catch (err) {
    const errResult = await AuraTrace.captureException(err, {
      route: "/api/test",
      user_id: 12345,
    });
    console.log("captureException result:", errResult);
  }

  console.log("SDK test completed cleanly!");
}

test();
