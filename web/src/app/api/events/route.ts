import { NextRequest, NextResponse } from "next/server";
import { listPublicEvents } from "@/lib/events";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get("industry");
    const eventType = searchParams.get("eventType");
    const severityParam = searchParams.get("severity");
    const limitParam = searchParams.get("limit");
    const minLngParam = searchParams.get("minLng");
    const minLatParam = searchParams.get("minLat");
    const maxLngParam = searchParams.get("maxLng");
    const maxLatParam = searchParams.get("maxLat");
    const extractionMethodsParam = searchParams.get("extractionMethods");

    const minLng = minLngParam ? Number(minLngParam) : null;
    const minLat = minLatParam ? Number(minLatParam) : null;
    const maxLng = maxLngParam ? Number(maxLngParam) : null;
    const maxLat = maxLatParam ? Number(maxLatParam) : null;

    const events = await listPublicEvents({
      industry,
      eventType,
      minSeverity: severityParam ? Number(severityParam) : null,
      limit: limitParam ? Number(limitParam) : 24,
      viewport:
        [minLng, minLat, maxLng, maxLat].every((value) => Number.isFinite(value))
          ? {
              minLng: minLng as number,
              minLat: minLat as number,
              maxLng: maxLng as number,
              maxLat: maxLat as number,
            }
          : null,
      extractionMethods: extractionMethodsParam
        ? extractionMethodsParam.split(",").filter(Boolean)
        : ["heuristic_v4", "heuristic_v3"],
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
