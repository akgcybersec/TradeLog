export interface ParsedInsightReport {
  headline: string;
  progress: string;
  consistency: string;
  strategy: string;
  timing: string;
  strengths: string[];
  issues: string[];
  priorities: string[];
  focus: string;
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

function toStringArray(value: unknown, max = 4): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
}

function firstString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  return "";
}

/** Parses stored insight JSON (or legacy markdown) into display fields. */
export function parseInsightReportRaw(raw: string): ParsedInsightReport {
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
      headline:
        firstString(obj.headline) ||
        firstString(obj.summary) ||
        firstString(obj.executiveSummary) ||
        "Coaching analysis complete.",
      progress: firstString(obj.progress) || firstString(obj.progressSinceLast) || "",
      consistency: firstString(obj.consistency) || "",
      strategy: firstString(obj.strategy) || firstString(obj.strategyAssessment) || "",
      timing: firstString(obj.timing) || firstString(obj.sessionTiming) || "",
      strengths: toStringArray(obj.strengths, 3),
      issues: toStringArray(obj.issues, 3),
      priorities: toStringArray(obj.priorities, 4),
      focus: firstString(obj.focus) || firstString(obj.focusPlan) || "",
    };
  }

  const plain = trimmed
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const firstPara = plain.split("\n\n")[0]?.slice(0, 240) ?? plain.slice(0, 240);

  return {
    headline: firstPara + (plain.length > 240 ? "…" : ""),
    progress: "",
    consistency: "",
    strategy: "",
    timing: "",
    strengths: [],
    issues: [],
    priorities: [],
    focus: "",
  };
}

export function serializeInsightReport(report: ParsedInsightReport): string {
  return JSON.stringify(report);
}
