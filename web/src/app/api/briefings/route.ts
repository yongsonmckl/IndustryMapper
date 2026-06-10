import { NextRequest, NextResponse } from "next/server";
import { listPublicBriefings } from "@/lib/briefings";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get("industry");
    const limitParam = searchParams.get("limit");

    const briefings = await listPublicBriefings({
      industry,
      limit: limitParam ? Number(limitParam) : 12,
    });

    return NextResponse.json({ briefings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list public briefings.",
      },
      { status: 500 },
    );
  }
}
