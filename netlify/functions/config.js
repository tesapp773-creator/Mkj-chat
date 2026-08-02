const CONFIG = {
  // Gemini
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_TIMEOUT: 10000,

  // Translation
  MAX_MESSAGE_LENGTH: 5000,
  ENABLE_LANGUAGE_DETECTION: true,
  ENABLE_MYMEMORY_FALLBACK: true,

  // Logging
  ENABLE_LOGGING: true,

  // Future features
  ENABLE_CACHE: false,
  ENABLE_AUTO_TRANSLATE: false
};

module.exports = CONFIG;
