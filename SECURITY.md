# 🛡️ AuraTrace Security Policy

## 🔒 Security Architecture & Controls

AuraTrace is designed with defense-in-depth principles for telemetry ingestion and autonomous self-healing:

### 1. Cryptographic Key Management
- **API Keys**: High-entropy keys prefixed with `at_live_` or `aura_live_`. Only the bcrypt hash (`$2b$12$...`) is stored in PostgreSQL.
- **Sensitive Credentials**: GitHub Personal Access Tokens and webhook secrets are encrypted with Fernet symmetric encryption (`AES-128-CBC` with `HMAC-SHA256`).
- **Dashboard Authentication**: Session management via JSON Web Tokens (`HS256`, 24-hour expiry).

### 2. Client-Side & Ingestion Data Scrubbing
- All SDKs (`auratrace-sdk` and `@auratrace/node`) sanitize runtime error payloads before dispatch.
- Authorization headers (`Bearer ...`), JWTs, OpenAI/Anthropic API keys (`sk-...`), GitHub tokens (`ghp_...`), and AWS access keys are scrubbed automatically.

### 3. Autonomous Repair Safety Gates
- **Syntax & Destructive Operations**: Patches containing dangerous commands (`rm -rf /`, `DROP TABLE`, `eval()`, `exec()`, `chmod 777`) are rejected by the patch validator.
- **Sensitive Code Paths**: Changes touching authentication, payments, encryption, terraform, or CI workflows require mandatory human review.
- **20-Minute Regression Rollback Guard**: Monitors real-time error rates post-deployment and reverts commits if errors exceed baseline.

### 4. Rate Limiting & Denial of Service Protection
- Redis-backed sliding window rate limiter protects endpoints against traffic bursts and abuse.

---

## 📬 Reporting Security Vulnerabilities

Please report security vulnerabilities to **`security@auratrace.dev`**. We respond within 24 hours.
