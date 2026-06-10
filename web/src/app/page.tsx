import { EventConsole } from "@/components/event-console";
import { listPublicEvents } from "@/lib/events";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  industry?: string;
  eventType?: string;
  severity?: string;
  selected?: string;
  centerLng?: string;
  centerLat?: string;
  zoom?: string;
}>;

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computeInitialViewport(search: Awaited<SearchParams>) {
  const centerLng = readNumber(search.centerLng, 18);
  const centerLat = readNumber(search.centerLat, 18);
  const zoom = readNumber(search.zoom, 1.35);
  const lngSpan = Math.min(Math.max(360 / zoom, 38), 360);
  const latSpan = Math.min(Math.max(170 / zoom, 24), 170);
  return {
    centerLng,
    centerLat,
    zoom,
    bounds: {
      minLng: Math.min(Math.max(centerLng - lngSpan / 2, -180), 180),
      maxLng: Math.min(Math.max(centerLng + lngSpan / 2, -180), 180),
      minLat: Math.min(Math.max(centerLat - latSpan / 2, -85), 85),
      maxLat: Math.min(Math.max(centerLat + latSpan / 2, -85), 85),
    },
  };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const severityNumber = resolvedSearchParams.severity
    ? Number(resolvedSearchParams.severity)
    : null;
  const viewport = computeInitialViewport(resolvedSearchParams);
  const supabase = getSupabaseServerClient();

  const [events, industriesResult, eventTypesResult] = await Promise.all([
    listPublicEvents({
      industry: resolvedSearchParams.industry,
      eventType: resolvedSearchParams.eventType,
      minSeverity: Number.isFinite(severityNumber) ? severityNumber : null,
      limit: 80,
      viewport: viewport.bounds,
      extractionMethods: ["heuristic_v3"],
    }),
    supabase.from("industries").select("slug,name").order("slug"),
    supabase.from("event_types").select("slug,name").order("name"),
  ]);

  if (industriesResult.error) {
    throw new Error(industriesResult.error.message);
  }

  if (eventTypesResult.error) {
    throw new Error(eventTypesResult.error.message);
  }

  return (
    <EventConsole
      initialEvents={events}
      industries={industriesResult.data ?? []}
      eventTypes={eventTypesResult.data ?? []}
      initialFilters={{
        industry: resolvedSearchParams.industry,
        eventType: resolvedSearchParams.eventType,
        severity: resolvedSearchParams.severity,
        selected: resolvedSearchParams.selected,
        centerLng: viewport.centerLng,
        centerLat: viewport.centerLat,
        zoom: viewport.zoom,
      }}
    />
  );
}
