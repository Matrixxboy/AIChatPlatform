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

    # Protect URLs from translation
    url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    urls = re.findall(url_pattern, text)
    placeholder_text = text
    for i, url in enumerate(urls):
        placeholder_text = placeholder_text.replace(url, f"[[URL_{i}]]")

    text_safe = placeholder_text.replace('"', '\\"')
    
    # Advanced Prompting with Few-Shot Examples and Context
    prompt = f"""
You are a high-fidelity neural translation engine.
Your goal is to translate text to "{to_lang}" with 100% semantic accuracy.

GUIDELINES:
1. Source language hint: "{from_lang}" (The user's profile is set to this, but the message might be in another language).
2. IF the text is already in "{to_lang}", return it exactly as is.
3. IF the text is in a different language, translate it to "{to_lang}".
4. Preserve tone, intent, and any emojis.
5. IMPORTANT: Preserve any placeholders like [[URL_0]], [[URL_1]], etc. EXACTLY as they are. Do NOT translate them.

EXAMPLES:
Input (English -> Hindi): "Check this out: [[URL_0]]"
Output: {{"translation": "इसे देखें: [[URL_0]]", "confidence": 100}}

Input (Hindi -> English): "नमस्ते, [[URL_0]] देखो"
Output: {{"translation": "Hello, look at [[URL_0]]", "confidence": 100}}

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
                        {"role": "system", "content": "You are a professional, accurate translator. You only output valid JSON. Always preserve placeholders like [[URL_X]]."},
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
                parsed = {}
                if json_match:
                    parsed = json.loads(json_match.group())
                else:
                    parsed = json.loads(content.strip())
                
                translated_text = parsed.get("translation", "")
                
                # Restore URLs
                for i, url in enumerate(urls):
                    translated_text = translated_text.replace(f"[[URL_{i}]]", url)
                    translated_text = translated_text.replace(f"[[URL_{i}]]".lower(), url) # Handle cases where LLM might lowercase the tag
                
                parsed["translation"] = translated_text
                return parsed
            except Exception as json_err:
                logger.warning(f"JSON Parsing failed, returning raw content: {json_err}")
                translated_text = content.strip()
                # Restore URLs
                for i, url in enumerate(urls):
                    translated_text = translated_text.replace(f"[[URL_{i}]]", url)
                return {"translation": translated_text, "confidence": 50}
    except Exception as e:
        logger.error(f"OpenRouter Connection/Request Error: {str(e)}")
        return None

async def batch_translate(messages, to_lang, domain="general"):
    """
    Translate multiple messages in a single LLM call.
    messages: list of dicts [{"id": str, "text": str}, ...]
    """
    if not messages:
        return []
        
    # Prepare the batch for the prompt
    batch_input = []
    for msg in messages:
        # Simple escaping for JSON-in-prompt safety
        safe_text = msg["text"].replace('"', '\\"').replace('\n', ' ')
        batch_input.append({"id": msg["id"], "text": safe_text})
        
    batch_json = json.dumps(batch_input)
    
    prompt = f"""
You are a high-fidelity neural translation engine.
Your goal is to translate a batch of messages to "{to_lang}".

TASK:
Translate the following list of messages. Return them in the same order with their original IDs.
If a message is already in "{to_lang}", keep it exactly as is.

INPUT BATCH (JSON):
{batch_json}

RESPONSE FORMAT:
Return ONLY a valid JSON object:
{{
    "translations": [
        {{"id": "msg_id_1", "translation": "translated_text_1"}},
        {{"id": "msg_id_2", "translation": "translated_text_2"}}
    ]
}}
"""

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            logger.info(f"Batch translating {len(messages)} messages to {to_lang}")
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
                        {"role": "system", "content": "You are a professional translator. You only output valid JSON. Always preserve original IDs."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenRouter Batch Error: {response.status_code}, {response.text}")
                return []
                
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return parsed.get("translations", [])
            else:
                parsed = json.loads(content.strip())
                return parsed.get("translations", [])
                
    except Exception as e:
        logger.error(f"Batch translation request error: {str(e)}")
        return []

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
