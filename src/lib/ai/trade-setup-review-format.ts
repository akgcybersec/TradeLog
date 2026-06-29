export interface ParsedSetupReview {
  summary: string;
  riskNote: string;
  strength: string;
  caution: string;
}

function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function firstString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

export function parseSetupReviewRaw(raw: string): ParsedSetupReview {
  const trimmed = raw.trim();
  let obj = tryParseJson(trimmed);

  if (!obj) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) obj = tryParseJson(fenced[1].trim());
  }
  if (!obj) {
    const brace = trimmed.match(/\{[\s\S]*\}/);
    if (brace) obj = tryParseJson(brace[0]);
  }

  if (obj) {
    return {
      summary: firstString(obj.summary) || firstString(obj.opinion) || "Setup review completed.",
      riskNote: firstString(obj.riskNote) || firstString(obj.risk) || "Review risk relative to your stop and account size.",
      strength: firstString(obj.strength) || firstString(obj.positive) || "",
      caution: firstString(obj.caution) || firstString(obj.watch) || "",
    };
  }

  return {
    summary: trimmed.slice(0, 320) + (trimmed.length > 320 ? "…" : ""),
    riskNote: "",
    strength: "",
    caution: "",
  };
}

export function serializeSetupReview(review: ParsedSetupReview): string {
  return JSON.stringify(review);
}
