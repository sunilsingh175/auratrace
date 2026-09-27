const auratrace = require('./dist/index.js');

const apiKey = process.env.AURATRACE_API_KEY || 'aura_live_master_auratrace_2026';

const client = auratrace.init({
  apiKey: apiKey,
  endpoint: 'http://localhost:8000',
  serviceName: 'sdk-test-node',
  environment: 'development',
});

console.log('Node.js SDK initialized. Sending test exception...');

try {
  const account = null;
  console.log(account.balance); // throws TypeError
} catch (err) {
  auratrace.captureException(err, { route: '/api/v1/billing', transactionId: 'tx_998123' });
  console.log('Captured TypeError via captureException().');
}

// Send custom event
auratrace.captureEvent('latency', { latencyMs: 280, endpoint: '/api/v1/orders' });

console.log('Flushing SDK queue...');
setTimeout(() => {
  client.flush();
  console.log('Node.js SDK test finished.');
}, 1500);
