# 🤝 Contributing to AuraTrace

Thank you for your interest in contributing to **AuraTrace**!

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/auratrace.git
   cd auratrace
   ```

2. **Set up local environment:**
   ```bash
   cp .env.example .env
   # Update GEMINI_API_KEY with your Google AI Studio API key
   ```

3. **Start local services:**
   ```bash
   docker compose up -d --build
   ```

---

## 🧪 Running Tests & Validation

- **Pipeline & Queue Verification:**
  ```bash
  python scripts/verify_pipeline.py
  ```
- **Production Readiness Audit:**
  ```bash
  python scripts/verify_production.py
  ```
- **Stress & Throughput Benchmark:**
  ```bash
  python scripts/stress_test.py --count 100 --concurrency 10
  ```

---

## 📐 Code Guidelines

- **Python:** Follow PEP 8 style guidelines.
- **Frontend / TypeScript:** Run `npm run lint` within the `frontend/` directory.
- **Git Commits:** Follow conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`).
- **PR Safety:** Ensure all newly added code paths pass without triggering safety gate warnings.
