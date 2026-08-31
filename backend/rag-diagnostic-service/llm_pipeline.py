import os
import sys
import google.generativeai as genai

# Ensure workspace is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.shared.logger import get_logger
except ImportError:
    from shared.logger import get_logger

logger = get_logger("llm-pipeline")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

class LLMDoctor:
    async def diagnose_incident(self, service_id, error_type, stack_trace, reason, similar_records):
        context = "\n".join([f"- Cause: {r['root_cause']}\n  Patch: {r['patch']}" for r in similar_records])
        
        prompt = f"""
        You are an expert DevOps engineer diagnosing an anomaly in {service_id}.
        Error Type: {error_type}
        Reason Flagged: {reason}
        Stack Trace: {stack_trace}
        
        Historical Context (Similar Past Incidents):
        {context if context else "No historical context available."}
        
        Provide your analysis in two sections explicitly separated by "|||":
        1. The Root Cause analysis (concise).
        2. The Suggested Patch/Command to fix it.
        """
        
        try:
            response = model.generate_content(prompt)
            parts = response.text.split("|||")
            if len(parts) >= 2:
                return parts[0].strip(), parts[1].strip()
            return response.text.strip(), "Review root cause for patch formulation."
        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            return "Unable to determine root cause.", "Manual intervention required."

llm_doctor = LLMDoctor()