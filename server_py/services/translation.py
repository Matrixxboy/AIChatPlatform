import httpx
import json
import logging
import re
from config import settings

logger = logging.getLogger(__name__)

async def translate_with_llm(text, from_lang, to_lang, domain="general"):
    domain_ctx = {
        "general": "everyday conversation",
        "business": "professional business communication",
        "medical": "medical and clinical communication",
        "technical": "technical and engineering communication",
        "legal": "legal and contractual communication"
    }.get(domain, "everyday conversation")

    text_safe = text.replace('"', '\\"')
    prompt = f"""You are a professional translator specialized in {domain_ctx}.
    Rules:
    * Do not add explanations, enhancements, summaries, or extra content
    * Do not omit any information from the original text
    * Preserve the original emotion, style, and sentence intent
    * Use accurate terminology for technical/medical/legal domains
    * Keep the translation as faithful and natural as possible in {to_lang}
    * Return ONLY valid JSON
    * Do not include markdown or additional formatting
    
    Translate the following text from {from_lang} to {to_lang}.
    Return ONLY a valid JSON object with the following fields:
    {{
      "translation": "the translated text",
      "confidence": 95,
      "notes": "brief note on any unavoidable translation nuance (optional, max 1 sentence)"
    }}

    Text: "{text_safe}"
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
                    "model": "mistralai/mistral-7b-instruct-v0.1",
                    "messages": [{"role": "user", "content": prompt}]
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
            # If OpenRouter fails, we don't fall back to Google anymore.
            # Return original text with an error indicator.
            return {
                "translation": text, 
                "confidence": 0, 
                "error": "Neural Link failed, showing original."
            }
            
        return result
    except Exception as e:
        logger.error(f"Translation logic error: {e}")
        return {"translation": text, "confidence": 0, "error": str(e)}
