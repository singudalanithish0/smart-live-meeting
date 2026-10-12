const DEFAULT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" }
];

export function getSupportedLanguages() {
  return DEFAULT_LANGUAGES;
}

export function detectLanguage(text = "") {
  const normalized = (text || "").toLowerCase();

  if (!normalized.trim()) {
    return "en";
  }

  if (/^[\u0600-\u06FF]+$/u.test(normalized)) return "ar";
  if (/[áéíóúñü]/.test(normalized)) return "es";
  if (/[àâçéèêëîïôûùüÿ]/.test(normalized)) return "fr";
  if (/[äöüß]/.test(normalized)) return "de";

  return "en";
}

export function translateText(text, targetLanguage = "en", sourceLanguage = "auto") {
  if (!text || !text.trim()) {
    return "";
  }

  const fromLanguage = sourceLanguage === "auto" ? detectLanguage(text) : sourceLanguage;
  if (fromLanguage === targetLanguage) {
    return text;
  }

  const stubTranslations = {
    en: { es: `(Traducción) ${text}`, fr: `(Traduction) ${text}`, de: `(Übersetzung) ${text}`, hi: `(अनुवाद) ${text}`, ar: `(ترجمة) ${text}` },
    es: { en: `(Translation) ${text}`, fr: `(Traduction) ${text}`, de: `(Übersetzung) ${text}`, hi: `(अनुवाद) ${text}`, ar: `(ترجمة) ${text}` },
    fr: { en: `(Translation) ${text}`, es: `(Traducción) ${text}`, de: `(Übersetzung) ${text}`, hi: `(अनुवाद) ${text}`, ar: `(ترجمة) ${text}` },
    de: { en: `(Translation) ${text}`, es: `(Traducción) ${text}`, fr: `(Traduction) ${text}`, hi: `(अनुवाद) ${text}`, ar: `(ترجمة) ${text}` },
    hi: { en: `(Translation) ${text}`, es: `(Traducción) ${text}`, fr: `(Traduction) ${text}`, de: `(Übersetzung) ${text}`, ar: `(ترجمة) ${text}` },
    ar: { en: `(Translation) ${text}`, es: `(Traducción) ${text}`, fr: `(Traduction) ${text}`, de: `(Übersetzung) ${text}`, hi: `(अनुवाद) ${text}` }
  };

  return stubTranslations[fromLanguage]?.[targetLanguage] || text;
}

export function buildSubtitleText(text, language = "en") {
  if (!text) {
    return "";
  }

  return `${language.toUpperCase()}: ${text}`;
}

export default {
  getSupportedLanguages,
  detectLanguage,
  translateText,
  buildSubtitleText
};
