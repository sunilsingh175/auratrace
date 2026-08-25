-- =============================================================================
-- AuraTrace Knowledge Base Seed Data
-- 384-dimensional vector representations matching sentence-transformers/all-MiniLM-L6-v2
-- =============================================================================

INSERT INTO incident_knowledge_base (error_type, stack_trace_pattern, root_cause, recommended_patch, embedding)
VALUES 
(
    'DatabaseConnectionPoolExhausted',
    'asyncpg.exceptions.TooManyConnectionsError: remaining connection slots are reserved for non-replication superuser connections\n  File "/app/backend/handlers/payment.py", line 42, in process_payment\n    conn = await db_pool.acquire()\n  File "asyncpg/pool.py", line 456, in acquire',
    'High concurrency caused database connection pool exhaustion. Connections were acquired without an async context manager, causing connection leakage under heavy traffic.',
    '```diff
- async def process_payment(payload: PaymentRequest):
-     conn = await db_pool.acquire()
-     result = await conn.fetch("SELECT * FROM accounts WHERE id = $1", payload.account_id)
-     return result
+ async def process_payment(payload: PaymentRequest):
+     async with db_pool.acquire() as conn:
+         result = await conn.fetch("SELECT * FROM accounts WHERE id = $1", payload.account_id)
+         return result
```',
    (SELECT ('[' || array_to_string(array_agg(sin(i * 0.1)::numeric(6,5)), ',') || ']')::vector(384) FROM generate_series(1, 384) i)
),
(
    'UnhandledTypeError',
    'TypeError: Cannot read properties of undefined (reading ''items'')\n    at parsePayload (/app/src/services/telemetry.js:28:18)\n    at processLogQueue (/app/src/worker.js:104:12)',
    'Unchecked property traversal on optional telemetry payload attributes. Payload had no "items" property defined during service cold-start.',
    '```diff
- function parsePayload(data) {
-   const items = data.payload.items;
-   return items.map(item => item.id);
- }
+ function parsePayload(data) {
+   const items = data?.payload?.items ?? [];
+   return items.map(item => item?.id).filter(Boolean);
+ }
```',
    (SELECT ('[' || array_to_string(array_agg(cos(i * 0.15)::numeric(6,5)), ',') || ']')::vector(384) FROM generate_series(1, 384) i)
),
(
    'MemoryLeakOutOfMemory',
    'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory\n  1: 0xb73420 node::Abort() [/usr/local/bin/node]\n  2: 0x98f23c v8::Utils::ReportOOMFailure',
    'Unbounded in-memory dictionary caching telemetry logs indefinitely without Time-To-Live (TTL) eviction or max size limits.',
    '```diff
- const cache = new Map();
- function storeEvent(key, val) {
-   cache.set(key, val);
- }
+ const { LRUCache } = require(''lru-cache'');
+ const cache = new LRUCache({ max: 10000, ttl: 1000 * 60 * 5 });
+ function storeEvent(key, val) {
+   cache.set(key, val);
+ }
```',
    (SELECT ('[' || array_to_string(array_agg(sin(i * 0.25)::numeric(6,5)), ',') || ']')::vector(384) FROM generate_series(1, 384) i)
),
(
    'DeadlockVictimException',
    'asyncpg.exceptions.DeadlockDetectedError: deadlock detected\nDETAIL: Process 14022 waits for ShareLock on transaction 8891; Process 14023 waits for ExclusiveLock on transaction 8890.\n  File "/app/services/ledger.py", line 87, in transfer',
    'Concurrent database transactions acquired row-level locks on accounts in inverted order, creating a classic circular dependency deadlock.',
    '```diff
- async def transfer_balance(from_id: str, to_id: str, amount: float):
-     await lock_account(from_id)
-     await lock_account(to_id)
+ async def transfer_balance(from_id: str, to_id: str, amount: float):
+     # Deterministic ascending lock ordering prevents circular deadlocks
+     first, second = sorted([from_id, to_id])
+     await lock_account(first)
+     await lock_account(second)
```',
    (SELECT ('[' || array_to_string(array_agg(cos(i * 0.35)::numeric(6,5)), ',') || ']')::vector(384) FROM generate_series(1, 384) i)
),
(
    'JWTSignatureVerificationFailed',
    'jwt.exceptions.ExpiredSignatureError: Signature has expired\n  File "/app/auth/middleware.py", line 55, in authenticate_request\n    payload = jwt.decode(token, SECRET, algorithms=["HS256"])',
    'Server time synchronization skew caused valid JWT tokens to be rejected immediately before client refresh window.',
    '```diff
- def authenticate_request(token: str):
-     return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
+ def authenticate_request(token: str):
+     return jwt.decode(
+         token,
+         SECRET_KEY,
+         algorithms=["HS256"],
+         leeway=30  # 30-second leeway buffer for distributed clock drift
+     )
```',
    (SELECT ('[' || array_to_string(array_agg(sin(i * 0.45)::numeric(6,5)), ',') || ']')::vector(384) FROM generate_series(1, 384) i)
),
(
    'ExternalRateLimitExceeded',
    'httpx.HTTPStatusError: Client error ''429 Too Many Requests'' for url ''https://api.stripe.com/v1/charges''\n  File "/app/clients/payment_gateway.py", line 33, in charge_card',
    'Burst calls exceeded external payment vendor rate limits. No exponential backoff with jitter was configured.',
    '```diff
- async def charge_card(payload: dict):
-     return await client.post("https://api.stripe.com/v1/charges", json=payload)
+ from tenacity import retry, wait_random_exponential, stop_after_attempt
+ @retry(wait=wait_random_exponential(multiplier=1, max=10), stop=stop_after_attempt(5))
+ async def charge_card(payload: dict):
+     res = await client.post("https://api.stripe.com/v1/charges", json=payload)
+     res.raise_for_status()
+     return res
```',
    (SELECT ('[' || array_to_string(array_agg(cos(i * 0.55)::numeric(6,5)), ',') || ']')::vector(384) FROM generate_series(1, 384) i)
);
