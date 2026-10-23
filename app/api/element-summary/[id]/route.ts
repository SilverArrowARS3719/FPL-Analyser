import { NextResponse } from "next/server";
import { getElementSummary } from "@/lib/fpl";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const elementId = Number(id);
  if (!Number.isFinite(elementId)) {
    return NextResponse.json({ error: "Invalid element id" }, { status: 400 });
  }
  try {
    const data = await getElementSummary(elementId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch element summary" },
      { status: 502 },
    );
  }
}
