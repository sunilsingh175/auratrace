# AuraTrace Node.js SDK

AuraTrace is an automatic crash-capture client.

## Installation

```bash
npm install @auratrace/node
```

Import it once during application startup:

```typescript
import "@auratrace/node";
```

That is the complete integration for unhandled process failures. Importing AuraTrace automatically installs handlers for `uncaughtException` and `unhandledRejection`, detects application metadata from `package.json`, and sends diagnostic events asynchronously.

Use a project-scoped `AURATRACE_API_KEY` and optionally `AURATRACE_ENDPOINT`. Never use an AuraTrace master/admin key in an application.

## Optional explicit configuration

```typescript
import { AuraTrace } from "@auratrace/node";

AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY,
  endpoint: process.env.AURATRACE_ENDPOINT,
});
```

## Optional manual capture and HTTP telemetry

Manual capture plus Express/Connect middleware remain available for caught exceptions and request-level telemetry. They are not required for automatic crash detection.

The SDK fails silently when the AuraTrace backend is unavailable so observability cannot interrupt the host application.
