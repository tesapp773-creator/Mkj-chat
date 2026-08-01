// netlify/functions/translate.js
//
// Purpose: call NVIDIA's Riva Translate model on behalf of the app, WITHOUT
// ever exposing the NVIDIA API key to the browser. The key lives only here,
// read from Netlify environment variables, never written into this file and
// never sent to the client.
//
// Mirrors the exact pattern already used in netlify/functions/livekit-token.js
// in this project — same CORS handling, same validation style, same
// try/catch shape — so it behaves consistently with what's already deployed
// and working.
//
// Confirmed from NVIDIA's own docs (screenshots reviewed during planning):
//   - Model name:    nvidia/riva-translate-4b-instruct-v2
//   - Prompt format: a "system" message containing the language pair as
//                     "<source>-<target>" (e.g. "en-es"), and a "user"
//                     message containing the text to translate.
// NOT independently confirmed from a screenshot (based on NVIDIA's standard,
// documented OpenAI-compatible endpoint pattern used across their model
// catalog) — if this is wrong, the function will fail cleanly with a clear
// error from NVIDIA rather than silently misbehaving:
//   - Endpoint URL:  https://integrate.api.nvidia.com/v1/chat/completions

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'nvidia/riva-translate-4b-instruct-v2';

exports.handler = async (event) => {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Preflight support (browsers send this before the real POST)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Server missing NVIDIA_API_KEY environment variable' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { text, sourceLang, targetLang } = body;

  if (!text || !sourceLang || !targetLang) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '"text", "sourceLang", and "targetLang" are all required (e.g. sourceLang: "en", targetLang: "es")' })
    };
  }

  try {
    const nvidiaResponse = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: `${sourceLang}-${targetLang}` },
          { role: 'user', content: text }
        ]
      })
    });

    const raw = await nvidiaResponse.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // NVIDIA returned something that isn't JSON — surface it as-is so we can see what actually happened
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'NVIDIA returned a non-JSON response', raw: raw.slice(0, 500) })
      };
    }

    if (!nvidiaResponse.ok) {
      // Pass NVIDIA's own error message straight through — most useful for diagnosing
      // a wrong model name, wrong endpoint, expired key, or rate limit, without guessing.
      return {
        statusCode: nvidiaResponse.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'NVIDIA API error', details: data })
      };
    }

    const translatedText = data?.choices?.[0]?.message?.content;

    if (!translatedText) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'NVIDIA response did not contain expected translated text', raw: data })
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ translatedText })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
