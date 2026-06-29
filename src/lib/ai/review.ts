import type { UserSettings } from "@/types/trade";
import type { TraderSnapshot } from "@/lib/ai/snapshot";
import type { ReviewImage } from "@/lib/ai/images";
import { parseTradeReviewRaw, serializeTradeReview } from "@/lib/ai/trade-review-format";
import { parseSetupReviewRaw, serializeSetupReview } from "@/lib/ai/trade-setup-review-format";
import { parseInsightReportRaw, serializeInsightReport } from "@/lib/ai/insight-report-format";
import { compareSnapshots, snapshotToSummary } from "@/lib/ai/snapshot";

export interface TradeReviewContext {
  instrument: string;
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  additionalTakeProfits?: number[];
  exitPrice?: number | null;
  exitOutcome?: string | null;
  positionSize: number;
  strategy?: string | null;
  notes?: string | null;
  postTradeImpression?: string | null;
  accountBalance?: number | null;
  riskRewardRatio?: number | null;
  riskPercent?: number | null;
  plannedRMultiple?: number | null;
  potentialProfit?: number | null;
  potentialLoss?: number | null;
  profitLoss?: number | null;
  profitLossPercent?: number | null;
  actualRMultiple?: number | null;
  pipsWonLost?: number | null;
  tradingSession?: string | null;
  dayOfWeek?: string | null;
  timeOfDay?: string | null;
  isWinner?: boolean | null;
  plannedProfitCaptured?: number | null;
  screenshotCount: number;
}

export interface PreviousInsightContext {
  analyzedAt: string;
  content: string;
  snapshot: TraderSnapshot;
}

const SENIOR_TRADER_PERSONA = `You are a senior trading mentor with 20+ years of experience across forex, indices, and commodities.
You speak like a calm, direct coach — not a textbook. You focus on process, risk, psychology, and sustainable edge.
Be specific. Reference the trader's own data. Avoid generic advice.`;

const PROCESS_GUARDRAIL = `- Judge PROCESS, not outcome. A winning trade can reflect a poor process and a losing trade a sound one. Never praise a trade simply because it was profitable, and never condemn one simply because it lost.`;
const DATA_HONESTY = `- Use ONLY the data provided. If key information is missing, say so explicitly instead of inventing it.`;
const NO_VISION_CLAUSE = `- You cannot see any attached screenshots — never describe chart visuals or candle patterns you weren't given.`;
const VISION_CLAUSE = `- Chart screenshot(s) the trader attached are included as images below. Analyze what you can actually see — market structure, key levels, where entry/stop/target sit, candle behavior. Never invent details that aren't visible in the images.`;
const MARKET_DATA_CLAUSE = `- Independent OHLCV market data fetched from a public source is provided. Use it to judge the setup objectively — trend, swing highs/lows, where the levels sat relative to structure, and how price actually behaved. It may be a proxy symbol, so reason about structure rather than exact ticks.`;

// Historical insights never carry images.
const COACHING_GUARDRAILS = `Ground rules:
${PROCESS_GUARDRAIL}
${DATA_HONESTY}
${NO_VISION_CLAUSE}`;

const TRADE_REVIEW_PROMPT = `Review this CLOSED trade as a direct personal coach.

Return ONLY valid JSON — no markdown, no code fences, no extra text — in exactly this shape:
{
  "summary": "1-2 plain sentences on setup quality and outcome. Judge process, not luck.",
  "mistake": "One main mistake in one sentence. If none, write: No major process mistake identified.",
  "improvement": "One concrete change for the next similar setup.",
  "keepDoing": "Optional one sentence on what worked (process only). Omit key if nothing worth keeping."
}

Rules:
- Be brief. Stay under 100 words total across all fields.
- Plain English sentences only. No bullet lists, headers, or formatting.
- Weight the trader's pre-trade notes heavily — they explain why they entered.
- Use ONLY the data provided. Do not invent chart or market details.`;

const SETUP_REVIEW_PROMPT = `Review this OPEN trade setup — it has NOT closed yet. Give an honest opinion on process and risk before outcome exists.

Return ONLY valid JSON — no markdown, no code fences, no extra text — in exactly this shape:
{
  "summary": "1-2 plain sentences on whether this is a sound setup right now.",
  "riskNote": "One sentence on the main risk (size, R:R, level placement, session).",
  "strength": "One sentence on what looks good in the plan.",
  "caution": "One sentence on what to watch while the trade is open."
}

Rules:
- Stay under 120 words total. No outcome judgment — the trade is still running.
- Weight the trader's own notes heavily — they state their entry thesis.
- Use ONLY the data provided. Do not invent chart or market details.`;

function buildTradeSummary(trade: TradeReviewContext): string {
  return JSON.stringify(
    {
      instrument: trade.instrument,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      additionalTakeProfits: trade.additionalTakeProfits ?? [],
      exitPrice: trade.exitPrice,
      exitOutcome: trade.exitOutcome ?? null,
      positionSize: trade.positionSize,
      accountBalance: trade.accountBalance,
      traderThesis: {
        strategy: trade.strategy ?? "Not specified",
        entryNotes: trade.notes ?? "No entry notes provided",
        postTradeReflection: trade.postTradeImpression ?? null,
      },
      riskRewardRatio: trade.riskRewardRatio,
      riskPercent: trade.riskPercent,
      plannedRMultiple: trade.plannedRMultiple,
      potentialProfit: trade.potentialProfit,
      potentialLoss: trade.potentialLoss,
      outcome: {
        profitLoss: trade.profitLoss,
        profitLossPercent: trade.profitLossPercent,
        actualRMultiple: trade.actualRMultiple,
        pipsWonLost: trade.pipsWonLost,
        plannedProfitCaptured: trade.plannedProfitCaptured,
        isWinner: trade.isWinner,
      },
      timing: {
        tradingSession: trade.tradingSession,
        dayOfWeek: trade.dayOfWeek,
        timeOfDay: trade.timeOfDay,
      },
      screenshotsAttached: trade.screenshotCount,
    },
    null,
    2,
  );
}

export async function generateTradeReview(
  trade: TradeReviewContext,
  settings: UserSettings,
  options: { images?: ReviewImage[]; marketContext?: string | null } = {},
): Promise<string> {
  const images = options.images ?? [];
  const guardrails = [
    "Ground rules:",
    PROCESS_GUARDRAIL,
    DATA_HONESTY,
    images.length ? VISION_CLAUSE : NO_VISION_CLAUSE,
    options.marketContext ? MARKET_DATA_CLAUSE : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `${SENIOR_TRADER_PERSONA}\n\n${guardrails}`;
  const marketBlock = options.marketContext
    ? `\n\n## Independent Market Data\n${options.marketContext}`
    : "";

  const userMessage = `${systemPrompt}\n\n${TRADE_REVIEW_PROMPT}\n\nTrade Data:\n${buildTradeSummary(
    trade,
  )}${marketBlock}`;

  const raw = await callProvider(userMessage, settings, systemPrompt, images, 500);
  return serializeTradeReview(parseTradeReviewRaw(raw));
}

export async function generateTradeSetupReview(
  trade: TradeReviewContext,
  settings: UserSettings,
  options: { images?: ReviewImage[]; marketContext?: string | null } = {},
): Promise<string> {
  const images = options.images ?? [];
  const guardrails = [
    "Ground rules:",
    DATA_HONESTY,
    images.length ? VISION_CLAUSE : NO_VISION_CLAUSE,
    options.marketContext ? MARKET_DATA_CLAUSE : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `${SENIOR_TRADER_PERSONA}\n\n${guardrails}`;
  const marketBlock = options.marketContext
    ? `\n\n## Independent Market Data\n${options.marketContext}`
    : "";

  const userMessage = `${systemPrompt}\n\n${SETUP_REVIEW_PROMPT}\n\nTrade Data:\n${buildTradeSummary(
    trade,
  )}${marketBlock}`;

  const raw = await callProvider(userMessage, settings, systemPrompt, images, 500);
  return serializeSetupReview(parseSetupReviewRaw(raw));
}

export async function generateHistoricalInsights(
  tradesSummary: string,
  settings: UserSettings,
  options: {
    currentSnapshot: TraderSnapshot;
    previousInsight?: PreviousInsightContext | null;
    newTradesSinceLast: number;
    preferredStrategy?: string | null;
  },
): Promise<string> {
  const previousBlock = options.previousInsight
    ? `
## Previous Coaching Report (${options.previousInsight.analyzedAt})
${JSON.stringify(parseInsightReportRaw(options.previousInsight.content), null, 2)}

## Stats at Previous Analysis
${snapshotToSummary(options.previousInsight.snapshot)}

## Progress Since Last Analysis (${options.newTradesSinceLast} new closed trades)
${compareSnapshots(options.previousInsight.snapshot, options.currentSnapshot)}
`
    : `## Previous Coaching Report
None — this is the first persisted analysis. Establish a baseline.`;

  const prompt = `${SENIOR_TRADER_PERSONA}

${COACHING_GUARDRAILS}
- Be statistically honest. Under ~20 closed trades, metrics are provisional — say so briefly.

Compare against the previous report when available. Call out improvements, regressions, and consistency.

${previousBlock}

## Current Performance Snapshot
${snapshotToSummary(options.currentSnapshot)}

## Detailed Recent Trades (most recent first — new since last report, plus a few for context)
Older trades are not listed individually; their aggregate is in the snapshot above. Use the snapshot for totals/win-rate and these rows for recent texture.
${tradesSummary}

Return ONLY valid JSON — no markdown, no code fences, no extra text — in exactly this shape:
{
  "headline": "2-3 plain sentences on where the trader stands right now.",
  "progress": "2-3 plain sentences on what changed since last report. If first report, describe baseline.",
  "consistency": "1-2 sentences on stability (win rate / pnl / R discipline).",
  "strategy": "1-2 sentences on whether current strategy focus is working and why.",
  "timing": "1-2 sentences on session/day timing patterns.",
  "strengths": ["Up to 3 concise strengths grounded in data."],
  "issues": ["Up to 3 concise issues grounded in data."],
  "priorities": ["Up to 4 one-line actions ranked by impact."],
  "focus": "2-3 sentence 30-day focus plan with measurable behavior."
}

Rules:
- Be concise but slightly detailed. Aim for 220-320 words total.
- Plain English only. No markdown, bullets in strings, or headers.
- Use ONLY provided data. Reference numbers from snapshots when relevant.`;

  const raw = await callProvider(prompt, settings, SENIOR_TRADER_PERSONA, [], 1200);
  return serializeInsightReport(parseInsightReportRaw(raw));
}

async function callProvider(
  message: string,
  settings: UserSettings,
  systemPrompt: string,
  images: ReviewImage[] = [],
  maxTokens = 4096,
): Promise<string> {
  switch (settings.aiProvider) {
    case "openai":
      return callOpenAI(message, settings, systemPrompt, images, maxTokens);
    case "gemini":
      return callGemini(message, settings, systemPrompt, images, maxTokens);
    case "anthropic":
    default:
      return callAnthropic(message, settings, images, maxTokens);
  }
}

async function callAnthropic(
  message: string,
  settings: UserSettings,
  images: ReviewImage[] = [],
  maxTokens = 4096,
): Promise<string> {
  const apiKey = settings.anthropicApiKey;
  if (!apiKey) throw new Error("Anthropic API key not configured");

  const content = images.length
    ? [
        ...images.map((img) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
        })),
        { type: "text" as const, text: message },
      ]
    : message;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.aiModel || "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "No response generated";
}

async function callOpenAI(
  message: string,
  settings: UserSettings,
  systemPrompt: string,
  images: ReviewImage[] = [],
  maxTokens = 4096,
): Promise<string> {
  const apiKey = settings.openaiApiKey;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const userContent = images.length
    ? [
        { type: "text" as const, text: message },
        ...images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: `data:${img.mediaType};base64,${img.data}` },
        })),
      ]
    : message;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.aiModel || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "No response generated";
}

async function callGemini(
  message: string,
  settings: UserSettings,
  systemPrompt: string,
  images: ReviewImage[] = [],
  maxTokens = 4096,
): Promise<string> {
  const apiKey = settings.geminiApiKey;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const parts = [
    { text: `${systemPrompt}\n\n${message}` },
    ...images.map((img) => ({
      inline_data: { mime_type: img.mediaType, data: img.data },
    })),
  ];

  const model = settings.aiModel || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated";
}
