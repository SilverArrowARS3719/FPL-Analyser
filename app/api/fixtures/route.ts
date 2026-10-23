import { NextRequest, NextResponse } from "next/server";
import { getFixtures } from "@/lib/fpl";

export async function GET(req: NextRequest) {
  const eventParam = req.nextUrl.searchParams.get("event");
  const eventId = eventParam ? Number(eventParam) : undefined;
  try {
    const data = await getFixtures(eventId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch FPL fixtures" },
      { status: 502 },
    );
  }
}
