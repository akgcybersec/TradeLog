import { prisma, getOrCreateSettings } from "@/lib/prisma";
import type { SmartDefaults } from "@/types/trade";

export async function computeSmartDefaults(): Promise<SmartDefaults> {
  const settings = await getOrCreateSettings();
  const trades = await prisma.trade.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const instrumentCounts = new Map<string, number>();
  for (const trade of trades) {
    instrumentCounts.set(trade.instrument, (instrumentCounts.get(trade.instrument) ?? 0) + 1);
  }

  let mostUsedInstrument: string | null = null;
  let maxCount = 0;
  for (const [instrument, count] of instrumentCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedInstrument = instrument;
    }
  }

  return {
    preferredBroker: settings.preferredBroker,
    defaultRiskPercent: settings.defaultRiskPercent,
    defaultPositionSize: settings.defaultPositionSize,
    mostUsedInstrument,
    preferredStrategy: settings.preferredStrategy,
    preferredTimeframe: settings.preferredTimeframe,
    preferredAccount: settings.preferredAccount,
    accountBalance: settings.accountBalance,
  };
}
