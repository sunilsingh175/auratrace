import asyncio
import os
from typing import Any, Optional

try:
    from backend.shared.logger import get_logger
except ImportError:
    try:
        from shared.logger import get_logger
    except ImportError:
        import logging
        get_logger = lambda name: logging.getLogger(name)

logger = get_logger("llm-pipeline")

genai: Any = None
try:
    from google import genai  # type: ignore
except (ImportError, Exception):
    genai = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
_raw_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
if "3.8" in _raw_model or "3.5" in _raw_model or not _raw_model:
    GEMINI_MODEL = "gemini-3.6-flash"
else:
    GEMINI_MODEL = _raw_model


class LLMDoctor:
    client: Optional[Any] = None

    def __init__(self) -> None:
        self.client = None

        if GEMINI_API_KEY and genai is not None:
            try:
                self.client = genai.Client(api_key=GEMINI_API_KEY)
                logger.info("Gemini client initialized with model %s", GEMINI_MODEL)
            except Exception as e:
                logger.warning("Failed to initialize Gemini client: %s", e)
        else:
            logger.warning(
                "GEMINI_API_KEY is not configured or google-genai not installed."
            )

    async def generate_diagnosis(self, prompt: str) -> str:
        if not self.client:
            return ""

        model_candidates = [
            GEMINI_MODEL,
            "gemini-3.6-flash",
        ]
        unique_models = list(dict.fromkeys(model_candidates))

        for model_name in unique_models:
            for attempt in range(1, 3):
                try:
                    logger.info(
                        "Generating diagnosis via Gemini %s (attempt %s/2)...",
                        model_name,
                        attempt,
                    )

                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            self.client.models.generate_content,
                            model=model_name,
                            contents=prompt,
                        ),
                        timeout=12.0,
                    )

                    text = (getattr(response, "text", "") or "").strip()
                    if text:
                        return text

                except asyncio.TimeoutError:
                    logger.warning("Gemini %s attempt %s timed out after 12s", model_name, attempt)
                    break
                except Exception as exc:
                    error_text = str(exc)
                    logger.warning(
                        "Gemini %s attempt %s failed: %s",
                        model_name,
                        attempt,
                        error_text,
                    )

                    if "404" in error_text or "not_found" in error_text.lower():
                        logger.warning("Model %s not found on API, skipping.", model_name)
                        break

                    if (
                        "429" in error_text
                        or "too_many_requests" in error_text.lower()
                        or "quota exceeded" in error_text.lower()
                    ):
                        logger.error("Gemini quota reached for %s", model_name)
                        break

                    await asyncio.sleep(0.5)

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
You are Trace AI Doctor, an expert software observability and incident-response assistant.

Your task is to diagnose the incident using ONLY the information provided below.

Application / Microservice:
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

WHAT HAPPENED:
<concise, factual explanation of what the application attempted and why it failed>

ROOT CAUSE:
<specific underlying technical root cause grounded in the supplied stack trace and telemetry>

RECOVERY PATCH:
<safe and actionable remediation code diff or recovery steps>
"""

        raw_response = await self.generate_diagnosis(prompt)

        if not raw_response:
            # High quality fallback grounded in the RAG similar records
            if similar_records and isinstance(similar_records, list) and len(similar_records) > 0:
                top_match = similar_records[0]
                hist_root = top_match.get("root_cause") or f"Historical pattern matched {error_type} profile."
                code_patch = top_match.get("code_patch") or top_match.get("fix_description") or "Apply verified context management and connection recovery patch."
                return (
                    f"WHAT HAPPENED:\nThe application encountered an unhandled {error_type} while executing operations.\n\nROOT CAUSE:\n{hist_root}",
                    f"Recommended Remediation Patch:\n{code_patch}",
                )

            return (
                f"WHAT HAPPENED:\nDetected anomalous exception in {service_id} ({error_type}).\n\nROOT CAUSE:\nRoot cause could not be determined from the available diagnostic context.",
                "Review recent deployments, check service database/network connections, and inspect service logs.",
            )

        lower = raw_response.lower()
        marker = "recovery patch:"

        if marker in lower:
            index = lower.index(marker)
            diagnosis_text = raw_response[:index].strip()
            patch = raw_response[index + len(marker):].strip()
            return (diagnosis_text, patch)

        return (
            raw_response.strip(),
            "Review the incident manually and verify the affected service.",
        )


llm_doctor = LLMDoctor()
