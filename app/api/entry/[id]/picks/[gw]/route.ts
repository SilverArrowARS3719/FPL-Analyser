import { NextResponse } from "next/server";
import { getEntryPicks } from "@/lib/fpl";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; gw: string }> },
) {
  const { id, gw } = await params;
  const entryId = Number(id);
  const gwId = Number(gw);
  if (!Number.isFinite(entryId) || !Number.isFinite(gwId)) {
    return NextResponse.json({ error: "Invalid id or gameweek" }, { status: 400 });
  }
  try {
    const data = await getEntryPicks(entryId, gwId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (e) {
    // FPL returns 404 here pre-deadline / before the gameweek locks — treat that
    // as "not available yet" rather than a hard failure so the UI can fall back.
    const message = e instanceof Error ? e.message : "";
    const status = message.includes(" 404") ? 404 : 502;
    return NextResponse.json(
      { error: "Picks not available for this gameweek yet" },
      { status },
    );
  }
}
