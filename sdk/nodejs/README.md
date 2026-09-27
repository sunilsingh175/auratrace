# AuraTrace Node.js SDK

Zero-config crash capture for Node.js applications.

## Install

```bash
npm install @auratrace/node
```

## Quick Start

```javascript
const auratrace = require('@auratrace/node');

auratrace.init({ apiKey: 'aura_live_...' });
```

That's it. Now every uncaught exception and unhandled rejection
is automatically captured and sent to AuraTrace.

## TypeScript

```typescript
import { init, captureException, captureEvent } from '@auratrace/node';

init({ apiKey: 'aura_live_...' });
```

## Manual capture

```javascript
try {
  await processPayment();
} catch (err) {
  auratrace.captureException(err);
}

auratrace.captureEvent('latency', { latencyMs: 3500, endpoint: '/api/checkout' });
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `AURATRACE_API_KEY` | API key (alternative to code) |
| `AURATRACE_ENDPOINT` | Override endpoint |
| `AURATRACE_SERVICE` | Service name |
| `AURATRACE_ENV` | Environment |
| `AURATRACE_DISABLED` | Set to `1` to disable |
