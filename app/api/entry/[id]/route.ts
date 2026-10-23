import { NextResponse } from "next/server";
import { getEntry } from "@/lib/fpl";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }
  try {
    const data = await getEntry(entryId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch FPL entry" },
      { status: 502 },
    );
  }
}
