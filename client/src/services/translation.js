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
  if (!text.trim()) {
    return "en";
  }

  const normalized = text.toLowerCase();
  const includesArabic = /[\u0600-\u06FF]/.test(normalized);
  const includesSpanish = /[áéíóúñü]/.test(normalized);
  const includesFrench = /[àâçéèêëîïôûùüÿ]/.test(normalized);
  const includesGerman = /[äöüß]/.test(normalized);

  if (includesArabic) return "ar";
  if (includesSpanish) return "es";
  if (includesFrench) return "fr";
  if (includesGerman) return "de";

  return "en";
}

export async function translateText(text, targetLanguage = "en", sourceLanguage = "auto") {
  if (!text || !text.trim()) {
    return "";
  }

  const fromLanguage = sourceLanguage === "auto" ? detectLanguage(text) : sourceLanguage;

  if (fromLanguage === targetLanguage) {
    return text;
  }

  const stubTranslations = {
    en: {
      es: "(Translation) " + text,
      fr: "(Traduction) " + text,
      de: "(Übersetzung) " + text,
      hi: "(अनुवाद) " + text,
      ar: "(ترجمة) " + text
    },
    es: {
      en: "(Translation) " + text,
      fr: "(Traduction) " + text,
      de: "(Übersetzung) " + text,
      hi: "(अनुवाद) " + text,
      ar: "(ترجمة) " + text
    },
    fr: {
      en: "(Translation) " + text,
      es: "(Traducción) " + text,
      de: "(Übersetzung) " + text,
      hi: "(अनुवाद) " + text,
      ar: "(ترجمة) " + text
    },
    de: {
      en: "(Translation) " + text,
      es: "(Traducción) " + text,
      fr: "(Traduction) " + text,
      hi: "(अनुवाद) " + text,
      ar: "(ترجمة) " + text
    },
    hi: {
      en: "(Translation) " + text,
      es: "(Traducción) " + text,
      fr: "(Traduction) " + text,
      de: "(Übersetzung) " + text,
      ar: "(ترجمة) " + text
    },
    ar: {
      en: "(Translation) " + text,
      es: "(Traducción) " + text,
      fr: "(Traduction) " + text,
      de: "(Übersetzung) " + text,
      hi: "(अनुवाद) " + text
    }
  };

  return stubTranslations[fromLanguage]?.[targetLanguage] || text;
}

export function buildSubtitleText(text, language = "en") {
  if (!text) {
    return "";
  }

  return `${language.toUpperCase()}: ${text}`;
}

export function summarizeMeetingText(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "No meeting summary generated yet.";
  }

  const text = messages
    .slice(-10)
    .map((entry) => entry?.text || "")
    .filter(Boolean)
    .join(" ");

  return text ? `${text.slice(0, 220)}${text.length > 220 ? "..." : ""}` : "No meeting summary generated yet.";
}
