import httpx
import json
import logging
import re
from config import settings

logger = logging.getLogger(__name__)

async def translate_with_llm(text, from_lang, to_lang, domain="general"):
    # If the source and target languages are the same, don't waste tokens
    if from_lang.lower() == to_lang.lower():
        return {"translation": text, "confidence": 100}

    domain_ctx = {
        "general": "everyday casual conversation",
        "business": "professional business communication",
        "medical": "medical and clinical communication",
        "technical": "technical and engineering communication",
        "legal": "legal and contractual communication"
    }.get(domain, "everyday casual conversation")

    text_safe = text.replace('"', '\\"')
    
    # Advanced Prompting with Few-Shot Examples and Context
    prompt = f"""
You are a high-fidelity neural translation engine for a real-time messaging app.
Your goal is to translate text from "{from_lang}" to "{to_lang}" with 100% semantic accuracy.

CONTEXT:
- The text is a real-time message between two users.
- Domain: {domain_ctx}.
- Preserve the exact meaning, tone (casual/formal), and intent.
- Do NOT add explanations, do NOT paraphrase, and do NOT change the meaning.
- If the text contains slang or idioms, find the closest natural equivalent in "{to_lang}".

EXAMPLES:
Input (English -> Hindi): "How are you doing?"
Output: {{"translation": "आप कैसे हैं?", "confidence": 100}}

Input (Hindi -> English): "नमस्ते, क्या हाल है?"
Output: {{"translation": "Hello, how are you?", "confidence": 100}}

TASK:
Translate the following text:
"{text_safe}"

RESPONSE FORMAT:
Return ONLY a valid JSON object:
{{
    "translation": "translated text here",
    "confidence": 95
}}
"""

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            logger.info(f"Translating via OpenRouter: {text[:20]}... to {to_lang}")
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "X-Title": "Biz Insights Translator"
                },
                json={
                    "model": "openai/gpt-oss-120b:free",
                    "messages": [
                        {"role": "system", "content": "You are a professional, accurate translator. You only output valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1 # Low temperature for high accuracy
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API Error: Status {response.status_code}, Response: {response.text}")
                return None
            
            response.raise_for_status()
            data = response.json()
            if "choices" not in data or not data["choices"]:
                logger.error(f"OpenRouter Unexpected Response Structure: {data}")
                return None
                
            content = data["choices"][0]["message"]["content"]
            
            # Robust JSON extraction
            try:
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                return json.loads(content.strip())
            except Exception as json_err:
                logger.warning(f"JSON Parsing failed, returning raw content: {json_err}")
                return {"translation": content.strip(), "confidence": 50}
    except Exception as e:
        logger.error(f"OpenRouter Connection/Request Error: {str(e)}")
        return None

async def translate(text, from_lang, to_lang, domain):
    try:
        # Exclusively use OpenRouter LLM
        result = await translate_with_llm(text, from_lang, to_lang, domain)
        
        if not result:
            return {
                "translation": text, 
                "confidence": 0, 
                "error": "Neural Link failed, showing original."
            }
            
        return result
    except Exception as e:
        logger.error(f"Translation logic error: {e}")
        return {"translation": text, "confidence": 0, "error": str(e)}
