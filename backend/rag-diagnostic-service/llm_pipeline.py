import os
import httpx
import google.generativeai as genai
from backend.shared.logger import get_logger

logger = get_logger("llm-pipeline")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure native Google Gemini API if key is available
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class LLMDoctor:
    async def generate_diagnosis(self, prompt: str) -> str:
        """
        Attempts to generate an AI root-cause diagnosis via OpenRouter first.
        If OpenRouter fails or is unavailable, falls back to the native Google Gemini SDK.
        """
        # 1. Try OpenRouter API with a stable model identifier
        if OPENROUTER_API_KEY:
            try:
                logger.info("Generating diagnosis via OpenRouter...")
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:3000",
                            "X-Title": "AuraTrace"
                        },
                        json={
                            "model": "openai/gpt-4o-mini",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are an expert OpenStack SRE and RAG Diagnostic Doctor. Analyze logs and provide concise root-cause analysis and a recovery patch."
                                },
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ]
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        logger.warning(f"OpenRouter returned status {response.status_code}: {response.text}")
            except Exception as e:
                logger.warning(f"OpenRouter generation failed: {e}. Attempting native fallback...")

        # 2. Fallback to Native Google Gemini SDK using a stable model name
        if GEMINI_API_KEY:
            try:
                logger.info("Generating diagnosis via Google Gemini SDK...")
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.error(f"Gemini fallback generation failed: {e}")

        return "⚠️ Diagnostic generation failed: All LLM providers returned errors or are unconfigured."

    async def diagnose_incident(
        self, service_id: str, error_type: str, stack_trace: str, reason: str, similar_records: list
    ) -> tuple:
        """
        Method called by worker.py to construct the prompt, query the LLM provider,
        and parse the response into a tuple of (root_cause, patch).
        """
        prompt = f"""
        Analyze the following OpenStack production incident:
        - Service ID: {service_id}
        - Error Type: {error_type}
        - Stack Trace / Log Message: {stack_trace}
        - Reason / Detection Context: {reason}
        
        Similar Historical Incidents Found via RAG Vector Search:
        {similar_records}
        
        Please provide a structured response containing:
        1. Root Cause Analysis
        2. Recommended Recovery Patch / Fix Steps
        """
        
        raw_response = await self.generate_diagnosis(prompt)
        
        root_cause = raw_response
        patch = "Review component permission configuration and verify storage daemon status."
        
        if "Patch" in raw_response or "patch" in raw_response.lower():
            for keyword in ["Patch:", "Recovery Patch", "Fix Steps"]:
                if keyword in raw_response:
                    parts = raw_response.split(keyword, 1)
                    root_cause = parts[0].replace("Root Cause", "").strip()
                    patch = parts[1].strip()
                    break
                    
        return root_cause, patch

# Instantiate the object expected by worker.py imports
llm_doctor = LLMDoctor()