import asyncio
import os

try:
    from backend.shared.logger import get_logger
except ImportError:
    from shared.logger import get_logger

from google import genai


logger = get_logger("llm-pipeline")


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    ""
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.8-flash"
).strip()


class LLMDoctor:

    def __init__(self):

        self.client = None

        if GEMINI_API_KEY:

            self.client = genai.Client(
                api_key=GEMINI_API_KEY
            )

            logger.info(
                "Gemini client initialized with model %s",
                GEMINI_MODEL
            )

        else:

            logger.warning(
                "GEMINI_API_KEY is not configured."
            )

    async def generate_diagnosis(
        self,
        prompt: str
    ) -> str:

        if not self.client:

            return (
                "Diagnostic generation is unavailable. "
                "Configure GEMINI_API_KEY."
            )

        for attempt in range(1, 4):

            try:

                logger.info(
                    "Generating diagnosis via Gemini %s "
                    "(attempt %s/3)...",
                    GEMINI_MODEL,
                    attempt
                )

                interaction = await asyncio.to_thread(
                    self.client.interactions.create,
                    model=GEMINI_MODEL,
                    input=prompt,
                )

                text = (
                    interaction.output_text or ""
                ).strip()

                if text:
                    return text

                logger.warning(
                    "Gemini returned empty output."
                )

            except Exception as exc:

                error_text = str(exc)

                logger.warning(
                    "Gemini attempt %s failed: %s",
                    attempt,
                    error_text
                )

                # ---------------------------------------------
                # Gemini quota/rate-limit handling
                # ---------------------------------------------

                if (
                    "429" in error_text
                    or "too_many_requests" in error_text.lower()
                    or "quota exceeded" in error_text.lower()
                    or "generate_content_free_tier_requests"
                    in error_text
                ):

                    logger.error(
                        "Gemini quota exceeded. "
                        "Stopping retries for this incident."
                    )

                    return (
                        "Gemini diagnosis is temporarily "
                        "unavailable because the configured "
                        "Gemini API quota has been exceeded."
                    )

            if attempt < 3:

                delay = 2 ** (
                    attempt - 1
                )

                logger.info(
                    "Retrying Gemini in %s seconds...",
                    delay
                )

                await asyncio.sleep(
                    delay
                )

        return (
            "Diagnostic generation failed "
            "after Gemini retries."
        )

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
You are AuraTrace AI Doctor, an expert software
observability and incident-response assistant.

Your task is to diagnose the incident using ONLY
the information provided below.

Do not assume MariaDB, MySQL, OpenStack,
Kubernetes, AWS, or any other infrastructure
technology unless it appears in the incident
data or historical records.

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

IMPORTANT:
- Do not invent infrastructure details.
- Do not mention technologies that are not supported by the evidence.
- Clearly state when the available evidence is insufficient.
- Prefer verification commands before destructive actions.
"""

        raw_response = await self.generate_diagnosis(
            prompt
        )

        if not raw_response:

            return (
                "No diagnosis was generated.",
                "Review the incident manually."
            )

        lower = raw_response.lower()

        marker = "recovery patch:"

        if marker in lower:

            index = lower.index(
                marker
            )

            root_cause = (
                raw_response[:index]
                .replace(
                    "ROOT CAUSE:",
                    ""
                )
                .strip()
            )

            patch = (
                raw_response[
                    index + len(marker):
                ]
                .strip()
            )

            return (
                root_cause,
                patch
            )

        return (
            raw_response.strip(),
            "Review the incident manually "
            "and verify the affected service."
        )


llm_doctor = LLMDoctor()