import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const HISTORY_PAGE_SIZE = 25;

export type HistoryStatusFilter = "all" | "closed" | "open";

export interface HistoryTradeRow {
  id: string;
  instrument: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  profitLoss: number | null;
  isWinner: boolean | null;
  riskRewardRatio: number | null;
  strategy: string | null;
  notes: string | null;
  postTradeImpression: string | null;
  tradingProfileId: string | null;
  profileName: string | null;
  broker: string | null;
  tradingSession: string | null;
  closedAt: string | null;
  openedAt: string;
  hasAiReview: boolean;
  aiReviewedAt: string | null;
  screenshots: { id: string; path: string; filename: string; label: string | null }[];
}

export interface HistoryQuery {
  page?: number;
  limit?: number;
  filter?: HistoryStatusFilter;
  profileId?: string | null;
  broker?: string | null;
  symbol?: string | null;
  q?: string | null;
}

const historyInclude = {
  screenshots: true,
  tradingProfile: true,
} as const;

type TradeWithRelations = Prisma.TradeGetPayload<{ include: typeof historyInclude }>;

type HistoryTradeRecord = Omit<TradeWithRelations, "aiReview" | "aiSetupReview">;

export function serializeHistoryTrade(t: HistoryTradeRecord): HistoryTradeRow {
  return {
    id: t.id,
    instrument: t.instrument,
    direction: t.direction,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    profitLoss: t.profitLoss,
    isWinner: t.isWinner,
    riskRewardRatio: t.riskRewardRatio,
    strategy: t.strategy,
    notes: t.notes,
    postTradeImpression: t.postTradeImpression,
    tradingProfileId: t.tradingProfileId,
    profileName: t.tradingProfile?.name ?? null,
    broker: t.tradingProfile?.broker ?? null,
    tradingSession: t.tradingSession,
    closedAt: t.closedAt?.toISOString() ?? null,
    openedAt: t.openedAt.toISOString(),
    hasAiReview: t.aiReviewedAt != null,
    aiReviewedAt: t.aiReviewedAt?.toISOString() ?? null,
    screenshots: t.screenshots.map((s) => ({
      id: s.id,
      path: s.path,
      filename: s.filename,
      label: s.label,
    })),
  };
}

function buildWhere(query: Omit<HistoryQuery, "page" | "limit">): Prisma.TradeWhereInput {
  const where: Prisma.TradeWhereInput = {};

  if (query.filter === "closed") where.exitPrice = { not: null };
  if (query.filter === "open") where.exitPrice = null;

  if (query.profileId) where.tradingProfileId = query.profileId;

  if (query.broker) {
    where.tradingProfile = { broker: query.broker };
  }

  if (query.symbol) where.instrument = query.symbol;

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { instrument: { contains: q } },
      { strategy: { contains: q } },
      { notes: { contains: q } },
      { postTradeImpression: { contains: q } },
      { tradingProfile: { name: { contains: q } } },
      { tradingProfile: { broker: { contains: q } } },
    ];
  }

  return where;
}

export async function fetchHistoryTrades(query: HistoryQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? HISTORY_PAGE_SIZE));
  const skip = (page - 1) * limit;
  const filter = query.filter ?? "closed";

  const listWhere = buildWhere({ ...query, filter });
  const countsWhere = buildWhere({ ...query, filter: "all" });

  const [trades, total, allCount, closedCount, openCount, symbolRows] = await Promise.all([
    prisma.trade.findMany({
      where: listWhere,
      include: historyInclude,
      orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
      skip,
      take: limit,
      // ponytail: omit aiReview text — hasAiReview uses aiReviewedAt only
      omit: { aiReview: true, aiSetupReview: true },
    }),
    prisma.trade.count({ where: listWhere }),
    prisma.trade.count({ where: countsWhere }),
    prisma.trade.count({ where: { ...countsWhere, exitPrice: { not: null } } }),
    prisma.trade.count({ where: { ...countsWhere, exitPrice: null } }),
    prisma.trade.findMany({
      select: { instrument: true },
      distinct: ["instrument"],
      orderBy: { instrument: "asc" },
    }),
  ]);

  return {
    trades: trades.map(serializeHistoryTrade),
    page,
    limit,
    total,
    hasMore: skip + trades.length < total,
    counts: { all: allCount, closed: closedCount, open: openCount },
    symbols: symbolRows.map((r) => r.instrument),
  };
}
