import { NextResponse } from "next/server";
import { getBootstrap } from "@/lib/fpl";

export async function GET() {
  try {
    const data = await getBootstrap();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch FPL bootstrap data" },
      { status: 502 },
    );
  }
}
