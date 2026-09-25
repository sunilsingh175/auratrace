# AuraTrace Node.js SDK

Official Node.js Telemetry & Crash Diagnostic SDK for **AuraTrace Autonomous Backend Diagnostics**.

Features:
- 🚀 **Zero-Configuration Setup**: Automatic microservice discovery and runtime registration.
- 🛡️ **Unhandled Crash Interception**: Captures `uncaughtException` and `unhandledRejection` with stack traces.
- ⚡ **Express / Connect Middleware**: Automatic HTTP request latency, status code, and route error tracking.
- 🤖 **AI-Ready Ingestion**: Streamlined telemetry dispatch to the AuraTrace AI diagnostics platform.

---

## Installation

```bash
npm install @auratrace/node
```

Or via Yarn / pnpm:

```bash
yarn add @auratrace/node
# or
pnpm add @auratrace/node
```

---

## Quickstart

### 1. Initialize AuraTrace

Initialize the SDK at the entry point of your application:

```typescript
import { AuraTrace } from '@auratrace/node';

AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY || 'at_live_your_api_key',
  endpoint: process.env.AURATRACE_ENDPOINT || 'http://localhost:8000',
  serviceName: 'order-service', // optional (auto-detected from package.json if omitted)
  environment: 'production',
});
```

### 2. Manual Event & Error Capture

```typescript
import { AuraTrace } from '@auratrace/node';

// 1. Log structured messages & telemetry
await AuraTrace.captureMessage("Order processed successfully", {
  order_id: "ord_10023",
  amount: 49.99,
});

// 2. Capture caught exceptions
try {
  processOrder();
} catch (error) {
  await AuraTrace.captureException(error, {
    order_id: "ord_10023",
    stage: "payment_gateway",
  });
}
```

### 3. Express Middleware Integration

```typescript
import express from 'express';
import { AuraTrace } from '@auratrace/node';

const app = express();

AuraTrace.init({
  serviceName: 'api-gateway',
  endpoint: 'http://localhost:8000',
});

// Request tracking middleware (must be before route handlers)
app.use(AuraTrace.requestHandler());

app.get('/api/checkout', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware (must be after route handlers)
app.use(AuraTrace.errorHandler());

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `AURATRACE_API_KEY` | AuraTrace Workspace / Master API Key | `""` |
| `AURATRACE_ENDPOINT` | AuraTrace Backend URL | `http://localhost:8000` |
| `AURATRACE_SERVICE_NAME` | Service Identifier | `name` in `package.json` |
| `NODE_ENV` | Environment identifier | `production` |

---

## License

MIT © [Sunil Singh](https://github.com/sunilsingh175)
