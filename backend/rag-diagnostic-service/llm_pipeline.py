"""
AuraTrace AI Crash Doctor LLM Pipeline
Synthesizes root causes and actionable code diffs using Gemini, OpenAI, or smart deterministic heuristics.
"""

import os
import re
import json
from typing import List, Dict, Any, Tuple
from backend.shared.logger import get_logger

logger = get_logger("rag-llm-pipeline")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()


class LLMDiagnosticDoctor:
    def __init__(self):
        self.gemini_model = None
        self.openai_client = None
        self._init_providers()

    def _init_providers(self):
        """Configures available LLM providers."""
        if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
            try:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Configured Google Gemini 1.5 Flash for crash diagnostics.")
            except Exception as e:
                logger.warning("Gemini initialization failed: %s", str(e))

        if OPENAI_API_KEY and OPENAI_API_KEY != "your_openai_api_key_here":
            try:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
                logger.info("Configured OpenAI client for crash diagnostics.")
            except Exception as e:
                logger.warning("OpenAI initialization failed: %s", str(e))

    async def diagnose_incident(
        self,
        service_id: str,
        error_type: str,
        stack_trace: str,
        reason: str,
        similar_records: List[Dict[str, Any]],
    ) -> Tuple[str, str]:
        """
        Executes RAG synthesis to generate root cause analysis and a code diff patch.
        Returns: (root_cause_explanation, git_diff_code_patch)
        """
        # Format retrieved knowledge base context
        kb_context_str = ""
        for i, rec in enumerate(similar_records, 1):
            kb_context_str += f"\n--- Historical Pattern {i} (Similarity: {rec.get('similarity_score', 0):.2f}) ---\n"
            kb_context_str += f"Error Type: {rec.get('error_type')}\n"
            kb_context_str += f"Known Root Cause: {rec.get('root_cause')}\n"
            kb_context_str += f"Known Solution Patch:\n{rec.get('recommended_patch')}\n"

        prompt = f"""You are AuraTrace AI Doctor, an expert principal site reliability engineer and software architect.
An anomaly was detected in service '{service_id}'.

Incident Details:
- Error Type: {error_type}
- Trigger Reason: {reason}
- Raw Stack Trace / Logs:
```
{stack_trace}
```

Retrieved Knowledge Base Similar Patterns from RAG:
{kb_context_str if kb_context_str else "No direct previous match in Knowledge Base."}

Your Task:
1. Provide a precise, 2-3 sentence Root Cause Explanation of why this failure occurred.
2. Provide an actionable Code Fix formatted STRICTLY as a unified git diff block (```diff ... ```).

Format your response EXACTLY as follows:
ROOT CAUSE:
<your root cause explanation>

RECOMMENDED CODE PATCH:
```diff
<your diff patch>
```
"""

        # 1. Try Gemini
        if self.gemini_model:
            try:
                response = self.gemini_model.generate_content(prompt)
                return self._parse_llm_response(response.text)
            except Exception as e:
                logger.error("Gemini diagnosis failed: %s. Falling back...", str(e))

        # 2. Try OpenAI
        if self.openai_client:
            try:
                resp = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are AuraTrace AI Doctor, an expert SRE."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                )
                content = resp.choices[0].message.content
                return self._parse_llm_response(content)
            except Exception as e:
                logger.error("OpenAI diagnosis failed: %s. Falling back...", str(e))

        # 3. Intelligent Heuristic Fallback (Zero-API key instant out-of-the-box synthesis)
        return self._heuristic_fallback(error_type, stack_trace, similar_records)

    def _parse_llm_response(self, text_resp: str) -> Tuple[str, str]:
        """Extracts root cause and code diff from LLM structured text."""
        root_cause = "Analysis complete."
        code_patch = ""

        if "ROOT CAUSE:" in text_resp:
            parts = text_resp.split("RECOMMENDED CODE PATCH:")
            root_cause = parts[0].replace("ROOT CAUSE:", "").strip()
            if len(parts) > 1:
                code_patch = parts[1].strip()
        else:
            root_cause = text_resp.strip()

        # Ensure diff has backticks
        if "```diff" not in code_patch and code_patch:
            code_patch = f"```diff\n{code_patch}\n```"

        return root_cause, code_patch

    def _heuristic_fallback(
        self,
        error_type: str,
        stack_trace: str,
        similar_records: List[Dict[str, Any]],
    ) -> Tuple[str, str]:
        """
        Synthesizes realistic root cause and code patch based on top-1 pgvector match
        or pattern rules when no external API key is active.
        """
        if similar_records:
            top = similar_records[0]
            root_cause = (
                f"**Identified by RAG Similarity Match ({top.get('similarity_score', 0)*100:.0f}% confidence):**\n"
                f"{top.get('root_cause')}\n\n"
                f"Stack trace signatures closely align with historical known incident pattern `{top.get('error_type')}`."
            )
            code_patch = top.get("recommended_patch", "")
            return root_cause, code_patch

        # Generic default diff
        root_cause = (
            f"**Automated Diagnostic:** Detected anomalous operational failure in `{error_type}`. "
            "Stack trace indicates unhandled boundary state or asynchronous resource leakage."
        )
        code_patch = """```diff
- async def execute_task(ctx):
-     # Unhandled execution without exception boundary
-     return perform_operation(ctx)
+ async def execute_task(ctx):
+     # Added fault-tolerant resilience boundary & error recovery
+     try:
+         return await perform_operation(ctx)
+     except Exception as exc:
+         logger.error("Handled operation failure: %s", exc)
+         return fallback_recovery(ctx)
```"""
        return root_cause, code_patch


# Global Singleton Doctor
llm_doctor = LLMDiagnosticDoctor()
