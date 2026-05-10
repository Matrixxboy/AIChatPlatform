import httpx
import json
import logging
import re
from config import settings

logger = logging.getLogger(__name__)

async def translate_with_llm(text, from_lang, to_lang, domain="general"):
    # Always allow the LLM to decide if translation is needed, 
    # especially since users might type in a language different from their profile setting.
    # We still pass from_lang as a 'hint'.

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
You are a high-fidelity neural translation engine.
Your goal is to translate text to "{to_lang}" with 100% semantic accuracy.

GUIDELINES:
1. Source language hint: "{from_lang}" (The user's profile is set to this, but the message might be in another language).
2. IF the text is already in "{to_lang}", return it exactly as is.
3. IF the text is in a different language, translate it to "{to_lang}".
4. Preserve tone, intent, and any emojis.

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
