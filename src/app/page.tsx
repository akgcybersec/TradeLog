import { prisma, getOrCreateSettings } from "@/lib/prisma";
import { ensureDefaultTradingProfile, enrichProfilesWithBalance } from "@/lib/trading-profiles";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureDefaultTradingProfile();

  const [trades, settings, profiles] = await Promise.all([
    prisma.trade.findMany({
      include: { tradingProfile: true },
      orderBy: { createdAt: "desc" },
    }),
    getOrCreateSettings(),
    prisma.tradingProfile.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ]);

  const profilesWithBalance = await enrichProfilesWithBalance(profiles);

  return (
    <DashboardClient
      startingBalance={settings.accountBalance}
      profiles={profilesWithBalance}
      trades={trades.map((t) => ({
        id: t.id,
        instrument: t.instrument,
        direction: t.direction,
        riskRewardRatio: t.riskRewardRatio,
        tradingSession: t.tradingSession,
        profitLoss: t.profitLoss,
        exitPrice: t.exitPrice,
        isWinner: t.isWinner,
        closedAt: t.closedAt?.toISOString() ?? null,
        openedAt: t.openedAt?.toISOString() ?? null,
        accountBalance: t.accountBalance,
        tradingProfileId: t.tradingProfileId,
        broker: t.tradingProfile?.broker ?? null,
        profileName: t.tradingProfile?.name ?? null,
      }))}
    />
  );
}
