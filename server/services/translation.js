const axios = require('axios');

const translateWithLLM = async (text, fromLang, toLang, domain = 'general') => {
  const domainCtx = {
    general: 'everyday conversation',
    business: 'professional business communication',
    medical: 'medical and clinical communication',
    technical: 'technical and engineering communication',
    legal: 'legal and contractual communication'
  }[domain] || 'everyday conversation';

  const prompt = `You are a professional translator specializing in ${domainCtx}.

Translate the following text from ${fromLang} to ${toLang}.

Rules:
- Preserve tone, register, and intent
- Use natural, fluent ${toLang} — not word-for-word substitution
- For technical/medical/legal domains, use correct terminology
- Return ONLY valid JSON

Input text: "${text}"

Respond with this exact JSON structure:
{
  "translation": "the translated text",
  "confidence": 95,
  "notes": "brief note on any translation choice (optional, max 1 sentence)"
}`;

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'inclusionai/ring-2.6-1t:free',
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'X-Title': 'Biz Insights Translator'
      },
      timeout: 10000 // 10s timeout for LLM
    });

    const content = response.data.choices[0].message.content;
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('LLM Translation Error:', error.message);
    return null; // Trigger fallback
  }
};

const translateWithGoogle = async (text, fromLang, toLang) => {
  // Simplified language code mapping - in production use a more comprehensive map
  const langCodes = {
    'English': 'en', 'Chinese (Mandarin)': 'zh', 'Spanish': 'es', 'French': 'fr',
    'German': 'de', 'Japanese': 'ja', 'Korean': 'ko', 'Arabic': 'ar',
    'Hindi': 'hi', 'Portuguese': 'pt', 'Russian': 'ru', 'Italian': 'it',
    'Dutch': 'nl', 'Turkish': 'tr', 'Gujarati': 'gu'
  };

  const target = langCodes[toLang] || 'en';
  const source = langCodes[fromLang] || 'en';

  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_KEY}`,
      {
        q: text,
        source: source,
        target: target,
        format: 'text'
      }
    );

    return {
      translation: response.data.data.translations[0].translatedText,
      confidence: 100, // Google doesn't always provide confidence in this simple call
      isFallback: true
    };
  } catch (error) {
    console.error('Google Translation Error:', error.message);
    throw new Error('All translation services failed');
  }
};

const translate = async (text, fromLang, toLang, domain) => {
  let result = await translateWithLLM(text, fromLang, toLang, domain);
  
  if (!result) {
    console.log('Falling back to Google Translate...');
    result = await translateWithGoogle(text, fromLang, toLang);
  }
  
  return result;
};

module.exports = { translate };
