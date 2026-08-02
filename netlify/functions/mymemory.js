async function translateWithMyMemory(
  message,
  sourceLanguage,
  targetLanguage
) {
  const params = new URLSearchParams({
    q: message,
    langpair: `${sourceLanguage}|${targetLanguage}`
  });

  if (process.env.MYMEMORY_EMAIL) {
    params.set("de", process.env.MYMEMORY_EMAIL);
  }

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );

  const data = await response.json();

  const translation =
    data?.responseData?.translatedText;

  if (!translation) {
    throw new Error("MyMemory returned no translation.");
  }

  return {
    success: true,
    provider: "mymemory",
    detectedLanguage: sourceLanguage,
    targetLanguage,
    needsTranslation:
      sourceLanguage !== targetLanguage,
    translation
  };
}

module.exports = {
  translateWithMyMemory
};
