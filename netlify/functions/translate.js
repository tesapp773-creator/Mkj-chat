// netlify/functions/translate.js
//
// Zero-cost translation backend for MKJ Chat, powered by the MyMemory
// Translation API (https://mymemory.translated.net). Replaces the previous
// NVIDIA riva-translate-4b-instruct-v2 backend, which only covered 36
// non-English languages (no Yoruba, Igbo, Hausa, or other African languages)
// and only translated reliably through English as a pivot — meaning a
// direct French -> Spanish message would fail even though English -> French
// worked fine. MyMemory translates any supported pair directly, no pivot.
//
// Contract is UNCHANGED so the front end needs no changes beyond the
// language list: POST {text, sourceLanguage, targetLanguage} -> {translation}
//
// Free tier: 5,000 words/day per IP with no signup at all. If you set the
// MYMEMORY_EMAIL environment variable in Netlify (Site settings > Environment
// variables) to any email address you control, MyMemory raises that to
// 50,000 words/day, still completely free. No card, no key required either way.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { text, sourceLanguage, targetLanguage } = body;
  if (!text || !sourceLanguage || !targetLanguage) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'text, sourceLanguage and targetLanguage are all required' })
    };
  }

  // Nothing to do if sender and receiver use the same language.
  if (sourceLanguage === targetLanguage) {
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ translation: text }) };
  }

  // MyMemory's free tier caps a single request around 500 bytes of source text.
  // Chat messages are almost always well under that; we trim defensively so a
  // huge paste doesn't just error out.
  const trimmed = text.length > 490 ? text.slice(0, 490) : text;

  const langpair = `${normalizeLang(sourceLanguage)}|${normalizeLang(targetLanguage)}`;
  const params = new URLSearchParams({ q: trimmed, langpair });
  if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL);

  const url = `https://api.mymemory.translated.net/get?${params.toString()}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const translated = data?.responseData?.translatedText;
    if (!translated) {
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: 'No translation returned from provider' }) };
    }

    // MyMemory returns HTTP 200 even on internal errors, but stuffs an error
    // string into translatedText instead (e.g. daily quota hit, bad langpair).
    // Catch those so the app shows "Translation unavailable" instead of
    // displaying the raw error text as if it were the translated message.
    if (/MYMEMORY WARNING|QUOTA|INVALID LANGPAIR|PLEASE SELECT|AMOUNT OF WORDS/i.test(translated)) {
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: translated }) };
    }

    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ translation: translated }) };
  } catch (err) {
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: err.message || 'Translation request failed' }) };
  }
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// MyMemory expects plain ISO 639-1 codes for most languages (en, fr, yo, ig,
// ha...) but wants region-tagged codes for a few where the app already used
// them (zh-CN, zh-TW, pt-BR, pt-PT, es-ES, es-US). This just passes those
// through unchanged and leaves everything else as-is.
function normalizeLang(code) {
  const passthroughRegionCodes = ['zh-CN', 'zh-TW', 'pt-BR', 'pt-PT', 'es-ES', 'es-US'];
  if (passthroughRegionCodes.includes(code)) return code;
  return code;
}
