import { getOrCreateSettings, prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/ai/config";
import { ensureDefaultTradingProfile, enrichProfilesWithBalance } from "@/lib/trading-profiles";
import { TradeHistoryList } from "@/components/history/TradeHistoryList";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await ensureDefaultTradingProfile();

  const [settings, profiles] = await Promise.all([
    getOrCreateSettings(),
    prisma.tradingProfile.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ]);

  const profilesWithBalance = await enrichProfilesWithBalance(profiles);

  return (
    <TradeHistoryList
      aiConfigured={isAiConfigured(settings)}
      profiles={profilesWithBalance}
    />
  );
}
