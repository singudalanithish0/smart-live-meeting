export function buildMeetingSummary(messages = []) {
  const entries = Array.isArray(messages) ? messages : [];
  const texts = entries
    .map((entry) => (typeof entry === "string" ? entry : entry?.text || ""))
    .filter(Boolean)
    .slice(-12);

  if (!texts.length) {
    return "No meeting summary generated yet.";
  }

  const summaryText = texts.join(" ");
  return summaryText.length > 260
    ? `${summaryText.slice(0, 257).trimEnd()}...`
    : summaryText;
}

export function summarizeFromText(text = "") {
  const cleaned = (text || "").trim();
  if (!cleaned) {
    return "No meeting summary generated yet.";
  }

  const sentences = cleaned.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const core = sentences.slice(0, 3).join(" ");

  return core || cleaned.slice(0, 260);
}

export default {
  buildMeetingSummary,
  summarizeFromText
};
