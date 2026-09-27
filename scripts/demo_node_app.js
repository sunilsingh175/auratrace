/**
 * AuraTrace — Node.js demo app.
 * Express service with SDK installed. Trigger crashes at /crash.
 *
 * Usage:
 *   node scripts/demo_node_app.js
 */
const express = require('express');
const auratrace = require('../sdk/nodejs/dist/index.js');

const API_KEY = process.env.AURATRACE_API_KEY || 'aura_live_master_auratrace_2026';

auratrace.init({
  apiKey: API_KEY,
  endpoint: process.env.AURATRACE_ENDPOINT || 'http://localhost:8000',
  serviceName: 'demo-express',
  environment: 'production',
});
console.log('✅ AuraTrace SDK initialized');

const app = express();
const PORT = 9001;

app.get('/', (req, res) => res.json({ status: 'ok', service: 'demo-express' }));

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.get('/crash/null', (req, res) => {
  const user = null;
  res.json({ name: user.name }); // throws
});

app.get('/crash/async', async (req, res) => {
  await Promise.reject(new Error('Async operation failed: amount is undefined'));
});

app.get('/crash/throw', (req, res) => {
  throw new Error('Intentional error for testing');
});

app.get('/latency', (req, res) => {
  const ms = parseInt(req.query.ms) || 3500;
  setTimeout(() => res.json({ status: 'slow', latencyMs: ms }), ms);
});

app.get('/manual', (req, res) => {
  try {
    throw new Error('Manual capture test');
  } catch (err) {
    auratrace.captureException(err, { tags: { endpoint: '/manual' } });
  }
  res.json({ captured: true });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Demo app running at http://localhost:${PORT}`);
  console.log('   Test endpoints:');
  console.log('     GET /crash/null');
  console.log('     GET /crash/async');
  console.log('     GET /latency?ms=5000');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});
