import asyncio
import os

try:
    from backend.shared.logger import get_logger
except ImportError:
    try:
        from shared.logger import get_logger
    except ImportError:
        import logging
        get_logger = lambda name: logging.getLogger(name)

logger = get_logger("llm-pipeline")

try:
    from google import genai
except ImportError:
    genai = None

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    ""
).strip()

_raw_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
# Normalize valid Gemini models
if "3.8" in _raw_model or "3.5" in _raw_model or not _raw_model:
    GEMINI_MODEL = "gemini-2.5-flash"
else:
    GEMINI_MODEL = _raw_model


class LLMDoctor:

    def __init__(self):

        self.client = None

        if GEMINI_API_KEY and genai:
            try:
                self.client = genai.Client(
                    api_key=GEMINI_API_KEY
                )

                logger.info(
                    "Gemini client initialized with model %s",
                    GEMINI_MODEL
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")
        else:

            logger.warning(
                "GEMINI_API_KEY is not configured or google-genai not installed."
            )

    async def generate_diagnosis(
        self,
        prompt: str
    ) -> str:

        if not self.client:

            return ""

        model_candidates = [
            GEMINI_MODEL,
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash",
        ]
        # remove duplicates preserving order
        unique_models = list(dict.fromkeys(model_candidates))

        for model_name in unique_models:
            for attempt in range(1, 3):
                try:
                    logger.info(
                        "Generating diagnosis via Gemini %s (attempt %s/2)...",
                        model_name,
                        attempt
                    )

                    # Standard google-genai generate_content API
                    response = await asyncio.to_thread(
                        self.client.models.generate_content,
                        model=model_name,
                        contents=prompt,
                    )

                    text = (getattr(response, "text", "") or "").strip()

                    if text:
                        return text

                except Exception as exc:
                    error_text = str(exc)
                    logger.warning(
                        "Gemini %s attempt %s failed: %s",
                        model_name,
                        attempt,
                        error_text
                    )

                    if (
                        "429" in error_text
                        or "too_many_requests" in error_text.lower()
                        or "quota exceeded" in error_text.lower()
                    ):
                        logger.error("Gemini quota reached for %s", model_name)
                        break

                    await asyncio.sleep(1)

        return ""

    async def diagnose_incident(
        self,
        service_id: str,
        error_type: str,
        stack_trace: str,
        reason: str,
        similar_records: list,
    ) -> tuple:

        historical_context = (
            similar_records
            if similar_records
            else "No similar historical incidents were found."
        )

        prompt = f"""
You are AuraTrace AI Doctor, an expert software observability and incident-response assistant.

Your task is to diagnose the incident using ONLY the information provided below.

Service ID:
{service_id}

Error Type:
{error_type}

Stack Trace / Log Message:
{stack_trace}

Detection Reason:
{reason}

Historical incidents retrieved by RAG:
{historical_context}

Return exactly this format:

ROOT CAUSE:
<concise technical explanation grounded in the supplied evidence>

RECOVERY PATCH:
<numbered, safe and actionable recovery steps>
"""

        raw_response = await self.generate_diagnosis(
            prompt
        )

        if not raw_response:
            # High quality fallback grounded in the RAG similar records
            if similar_records and isinstance(similar_records, list) and len(similar_records) > 0:
                top_match = similar_records[0]
                root_cause = top_match.get("root_cause") or f"Anomaly pattern matched historical {error_type} profile."
                code_patch = top_match.get("code_patch") or top_match.get("fix_description") or "Apply verified context management and connection recovery patch."
                return (
                    f"Synthesized RAG Analysis: {root_cause}",
                    f"Recommended Remediation Patch:\n{code_patch}"
                )

            return (
                f"Automated Anomaly Analysis: Detected anomalous performance spike or exception in {service_id} ({error_type}).",
                "Review recent deployments, check service database/network connections, and inspect service logs."
            )

        lower = raw_response.lower()
        marker = "recovery patch:"

        if marker in lower:
            index = lower.index(marker)
            root_cause = (
                raw_response[:index]
                .replace("ROOT CAUSE:", "")
                .replace("Root Cause:", "")
                .strip()
            )
            patch = (
                raw_response[index + len(marker):]
                .strip()
            )
            return (root_cause, patch)

        return (
            raw_response.strip(),
            "Review the incident manually and verify the affected service."
        )


llm_doctor = LLMDoctor()