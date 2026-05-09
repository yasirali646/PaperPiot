/**
 * Flattens LLM markdown/HTML-ish output to plain text for jsPDF (Helvetica has
 * limited Unicode; stripping markup avoids odd wrapping and “empty” sections).
 */
export function plainTextForPdf(raw: string): string {
  const s = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/(div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

/**
 * Normalizes text so jsPDF’s Helvetica metrics / splitTextToSize don’t produce
 * per-letter gaps or clipped lines (smart punctuation, ZWJ, NBSP, bullets).
 */
export function toPdfSafeText(raw: string): string {
  const base = plainTextForPdf(raw);
  return base
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0]/g, " ")
    .replace(/\t/g, " ")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/•/g, "- ")
    .split("\n")
    .map((line) => line.replace(/ +/g, " ").trimEnd())
    .join("\n")
    .trim();
}
