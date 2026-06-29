export interface ParsedTradeReview {
  summary: string;
  mistake: string;
  improvement: string;
  keepDoing?: string;
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

/** Parses stored review JSON (or legacy markdown prose) into display fields. */
export function parseTradeReviewRaw(raw: string): ParsedTradeReview {
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
    const summary =
      firstString(obj.summary) ||
      firstString(obj.verdict) ||
      firstString(obj.overview) ||
      "Review completed.";
    const mistake =
      firstString(obj.mistake) ||
      firstString(obj.mainMistake) ||
      firstString(obj.mistakes) ||
      "";
    const improvement =
      firstString(obj.improvement) ||
      firstString(obj.fix) ||
      firstString(obj.improvements) ||
      "";
    const keepDoing = firstString(obj.keepDoing) || firstString(obj.keep) || undefined;

    return {
      summary,
      mistake: mistake || "No major process mistake identified.",
      improvement: improvement || "Follow your written plan on the next similar setup.",
      keepDoing: keepDoing || undefined,
    };
  }

  // Legacy long markdown reviews — collapse to a short readable block.
  const plain = trimmed
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    summary: plain.slice(0, 320) + (plain.length > 320 ? "…" : ""),
    mistake: "",
    improvement: "",
  };
}

export function serializeTradeReview(review: ParsedTradeReview): string {
  return JSON.stringify(review);
}
