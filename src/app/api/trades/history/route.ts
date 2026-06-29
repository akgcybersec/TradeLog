import { NextResponse } from "next/server";
import { fetchHistoryTrades, type HistoryStatusFilter } from "@/lib/history-trades";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filter = (searchParams.get("filter") ?? "closed") as HistoryStatusFilter;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || undefined;

  const result = await fetchHistoryTrades({
    page,
    limit,
    filter: ["all", "closed", "open"].includes(filter) ? filter : "closed",
    profileId: searchParams.get("profileId") || null,
    broker: searchParams.get("broker") || null,
    symbol: searchParams.get("symbol") || null,
    q: searchParams.get("q") || null,
  });

  return NextResponse.json(result);
}
