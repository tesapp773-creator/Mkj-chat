const MODEL = "gemini-2.5-flash";

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Gemini request failed."
    );
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
  );
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function detectAndTranslate(
  message,
  targetLanguage
) {
  const prompt = `
You are an expert translation engine.

Analyse the message.

1. Detect its language.
2. If it is already in the target language,
   return the original message.
3. Otherwise translate naturally.
4. Preserve:
   - emojis
   - URLs
   - markdown
   - names
   - mentions
   - hashtags

Return ONLY valid JSON.

{
  "success": true,
  "provider": "gemini",
  "detectedLanguage": "",
  "targetLanguage": "${targetLanguage}",
  "needsTranslation": true,
  "translation": ""
}

Message:

${message}
`;

  const raw = await callGemini(prompt);

  const result = safeParseJSON(raw);

  if (!result) {
    throw new Error("Gemini returned invalid JSON.");
  }

  return result;
}

module.exports = {
  detectAndTranslate
};
