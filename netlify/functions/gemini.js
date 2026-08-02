const CONFIG = require("./config");
const ERRORS = require("./errors");
const logger = require("./logger");
const PROMPTS = require("./prompts");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimeout(name, fallback) {
  return CONFIG?.TIMEOUTS?.[name] ?? fallback;
}

function getMaxRetries() {
  return Number.isInteger(CONFIG?.MAX_RETRIES) ? CONFIG.MAX_RETRIES : 2;
}

function getRetryDelay() {
  return Number.isInteger(CONFIG?.RETRY_DELAY) ? CONFIG.RETRY_DELAY : 1000;
}

function getContentType() {
  return CONFIG?.DEFAULT_CONTENT_TYPE || "application/json";
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callGemini(requestId, prompt, timeoutMs) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(ERRORS.MISSING_API_KEY);
  }

  const maxRetries = getMaxRetries();
  const retryDelay = getRetryDelay();
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info(requestId, `Gemini attempt ${attempt + 1}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": getContentType(),
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      clearTimeout(timer);

      if (!response.ok) {
        const status = response.status;
        const retryable = isRetryableStatus(status);

        if (retryable && attempt < maxRetries) {
          logger.warn(requestId, `Gemini HTTP ${status}, retrying...`);
          await sleep(retryDelay * (attempt + 1));
          continue;
        }

        throw new Error(`Gemini HTTP ${status}`);
      }

      const data = await response.json();
      const text = extractGeminiText(data);

      if (!text) {
        throw new Error(ERRORS.INVALID_RESPONSE);
      }

      logger.info(requestId, "Gemini success");
      return text;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      const isAbort = error?.name === "AbortError";
      const shouldRetry = (isAbort || isRetryableStatus(error?.status)) && attempt < maxRetries;

      logger.warn(requestId, error?.message || "Gemini request failed");

      if (shouldRetry) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  logger.error(requestId, lastError?.message || "Gemini failed");
  throw lastError || new Error(ERRORS.GEMINI_FAILED);
}

async function translateWithGemini(requestId, text, targetLanguage) {
  const prompt = PROMPTS.buildTranslatePrompt(text, targetLanguage);
  const raw = await callGemini(
    requestId,
    prompt,
    getTimeout("TRANSLATION", 15000)
  );

  const parsed = safeJsonParse(raw);

  if (!parsed) {
    throw new Error(ERRORS.INVALID_RESPONSE);
  }

  return parsed;
}

async function detectLanguage(requestId, text) {
  const prompt = PROMPTS.buildDetectLanguagePrompt(text);
  const raw = await callGemini(
    requestId,
    prompt,
    getTimeout("DETECTION", 10000)
  );

  return raw.trim();
}

module.exports = {
  translateWithGemini,
  detectLanguage,
};
