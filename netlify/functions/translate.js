// netlify/functions/translate.js
//
// The single translation endpoint the app calls: POST /.netlify/functions/translate
// with { text, sourceLanguage, targetLanguage } -> { translation }.
//
// Primary path: Gemini (gemini.js + prompts.js). Gemini detects the source
// language itself and covers every language in languages.js in one call.
//
// Fallback path: MyMemory (mymemory.js), free and keyless, used automatically
// if Gemini errors out (missing/invalid key, quota, timeout, bad JSON back)
// and CONFIG.ENABLE_MYMEMORY_FALLBACK is true.

const CONFIG = require("./config");
const ERRORS = require("./errors");
const CONSTANTS = require("./constants");
const logger = require("./logger");
const response = require("./response");
const { validate } = require("./validator");
const { cleanTranslation } = require("./utils");
const { generateRequestId } = require("./requestId");
const { translateWithGemini } = require("./gemini");
const { translateWithMyMemory } = require("./mymemory");

exports.handler = async (event) => {
  const requestId = generateRequestId();

  if (event.httpMethod !== "POST") {
    return response.error(requestId, CONSTANTS.HTTP.METHOD_NOT_ALLOWED, "Method not allowed");
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response.error(requestId, CONSTANTS.HTTP.BAD_REQUEST, ERRORS.INVALID_JSON);
  }

  try {
    validate(body);
  } catch (err) {
    return response.error(requestId, CONSTANTS.HTTP.BAD_REQUEST, err.message);
  }

  const { text, sourceLanguage, targetLanguage } = body;

  // Nothing to do if sender and receiver already share a language.
  if (sourceLanguage && sourceLanguage === targetLanguage) {
    return response.success(requestId, { translation: text });
  }

  try {
    const result = await translateWithGemini(requestId, text, targetLanguage);
    const translation = cleanTranslation(result?.translation) || text;

    logger.info(requestId, "Gemini translation ok");

    return response.success(requestId, {
      translation,
      provider: CONSTANTS.PROVIDERS.GEMINI,
      detectedLanguage: result?.detectedLanguage || sourceLanguage || null
    });
  } catch (geminiErr) {
    logger.warn(requestId, `Gemini failed: ${geminiErr.message}`);

    // No fallback configured, or we don't know the source language MyMemory needs.
    if (!CONFIG.ENABLE_MYMEMORY_FALLBACK || !sourceLanguage) {
      return response.error(
        requestId,
        CONSTANTS.HTTP.BAD_GATEWAY,
        geminiErr.message || ERRORS.GEMINI_FAILED
      );
    }

    try {
      const fallback = await translateWithMyMemory(text, sourceLanguage, targetLanguage);

      logger.info(requestId, "MyMemory fallback ok");

      return response.success(requestId, {
        translation: cleanTranslation(fallback.translation) || text,
        provider: CONSTANTS.PROVIDERS.MYMEMORY,
        detectedLanguage: sourceLanguage
      });
    } catch (fallbackErr) {
      logger.error(requestId, `MyMemory fallback also failed: ${fallbackErr.message}`);
      return response.error(requestId, CONSTANTS.HTTP.BAD_GATEWAY, ERRORS.TRANSLATION_FAILED);
    }
  }
};
