const LANGUAGES = {
  "af": "Afrikaans",
  "am": "Amharic",
  "ar": "Arabic",
  "az": "Azerbaijani",
  "bn": "Bengali",
  "bg": "Bulgarian",
  "ca": "Catalan",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "hr": "Croatian",
  "cs": "Czech",
  "da": "Danish",
  "nl": "Dutch",
  "en": "English",
  "et": "Estonian",
  "fi": "Finnish",
  "fr": "French",
  "de": "German",
  "el": "Greek",
  "gu": "Gujarati",
  "ha": "Hausa",
  "he": "Hebrew",
  "hi": "Hindi",
  "hu": "Hungarian",
  "ig": "Igbo",
  "id": "Indonesian",
  "it": "Italian",
  "ja": "Japanese",
  "kn": "Kannada",
  "ko": "Korean",
  "lt": "Lithuanian",
  "lv": "Latvian",
  "ms": "Malay",
  "ml": "Malayalam",
  "mr": "Marathi",
  "ne": "Nepali",
  "no": "Norwegian",
  "fa": "Persian",
  "pl": "Polish",
  "pt": "Portuguese",
  "pa": "Punjabi",
  "ro": "Romanian",
  "ru": "Russian",
  "sr": "Serbian",
  "sk": "Slovak",
  "sl": "Slovenian",
  "so": "Somali",
  "es": "Spanish",
  "sw": "Swahili",
  "sv": "Swedish",
  "ta": "Tamil",
  "te": "Telugu",
  "th": "Thai",
  "tr": "Turkish",
  "uk": "Ukrainian",
  "ur": "Urdu",
  "vi": "Vietnamese",
  "wo": "Wolof",
  "xh": "Xhosa",
  "yo": "Yoruba",
  "zu": "Zulu"
};

function getLanguageName(code) {
  return LANGUAGES[code] || code;
}

function isSupportedLanguage(code) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, code);
}

module.exports = {
  LANGUAGES,
  getLanguageName,
  isSupportedLanguage
};
