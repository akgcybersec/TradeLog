import { getOrCreateSettings, prisma } from "@/lib/prisma";

export type PositionSizingMode = "manual" | "risk";

export interface TradingProfileRow {
  id: string;
  name: string;
  broker: string | null;
  accountLabel: string | null;
  initialBalance: number;
  defaultRiskPercent: number;
  defaultPositionSize: number;
  positionSizingMode: string;
  isDefault: boolean;
  currency: string;
}

export interface TradingProfileWithBalance extends TradingProfileRow {
  currentBalance: number;
}

/** Closed-trade P/L only — ponytail: no deposit/withdrawal ledger. */
export async function getProfileCurrentBalance(profileId: string): Promise<number> {
  const profile = await prisma.tradingProfile.findUnique({ where: { id: profileId } });
  if (!profile) return 0;

  const agg = await prisma.trade.aggregate({
    where: { tradingProfileId: profileId, exitPrice: { not: null } },
    _sum: { profitLoss: true },
  });

  return profile.initialBalance + (agg._sum.profitLoss ?? 0);
}

export async function enrichProfilesWithBalance(
  profiles: TradingProfileRow[],
): Promise<TradingProfileWithBalance[]> {
  return Promise.all(
    profiles.map(async (p) => ({
      ...p,
      currentBalance: await getProfileCurrentBalance(p.id),
    })),
  );
}

export async function ensureDefaultTradingProfile(): Promise<void> {
  const count = await prisma.tradingProfile.count();
  if (count > 0) return;

  const settings = await getOrCreateSettings();
  const profile = await prisma.tradingProfile.create({
    data: {
      name: settings.preferredAccount?.trim() || "Main Account",
      broker: settings.preferredBroker,
      accountLabel: settings.preferredAccount,
      initialBalance: settings.accountBalance,
      defaultRiskPercent: settings.defaultRiskPercent,
      defaultPositionSize: settings.defaultPositionSize,
      positionSizingMode: "manual",
      isDefault: true,
    },
  });

  await prisma.trade.updateMany({
    where: { tradingProfileId: null },
    data: { tradingProfileId: profile.id },
  });
}

export async function getDefaultTradingProfile() {
  await ensureDefaultTradingProfile();
  const preferred = await prisma.tradingProfile.findFirst({ where: { isDefault: true } });
  if (preferred) return preferred;
  return prisma.tradingProfile.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function setDefaultTradingProfile(profileId: string): Promise<void> {
  await prisma.$transaction([
    prisma.tradingProfile.updateMany({ data: { isDefault: false } }),
    prisma.tradingProfile.update({ where: { id: profileId }, data: { isDefault: true } }),
  ]);
}
