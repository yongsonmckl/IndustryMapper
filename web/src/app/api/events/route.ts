import { NextRequest, NextResponse } from "next/server";
import { listPublicEvents } from "@/lib/events";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get("industry");
    const eventType = searchParams.get("eventType");
    const severityParam = searchParams.get("severity");
    const limitParam = searchParams.get("limit");

    const events = await listPublicEvents({
      industry,
      eventType,
      minSeverity: severityParam ? Number(severityParam) : null,
      limit: limitParam ? Number(limitParam) : 24,
    });

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list public events.",
      },
      { status: 500 },
    );
  }
}
