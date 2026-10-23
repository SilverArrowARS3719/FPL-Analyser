import { NextResponse } from "next/server";
import { getEventLive } from "@/lib/fpl";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gw: string }> },
) {
  const { gw } = await params;
  const gwId = Number(gw);
  if (!Number.isFinite(gwId)) {
    return NextResponse.json({ error: "Invalid gameweek" }, { status: 400 });
  }
  try {
    const data = await getEventLive(gwId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch live event data" },
      { status: 502 },
    );
  }
}
