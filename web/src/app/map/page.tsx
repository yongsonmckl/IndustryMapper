import { listPublicBriefings } from "@/lib/briefings";
import { listPublicEvents } from "@/lib/events";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { MapExplorer } from "@/components/map-explorer";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  industry?: string;
  eventType?: string;
  severity?: string;
  selected?: string;
  briefing?: string;
  centerLng?: string;
  centerLat?: string;
  zoom?: string;
}>;

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computeInitialViewport(search: Awaited<SearchParams>) {
  return {
    centerLng: readNumber(search.centerLng, 10),
    centerLat: readNumber(search.centerLat, 20),
    zoom: readNumber(search.zoom, 1.55),
  };
}

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const severityNumber = resolvedSearchParams.severity
    ? Number(resolvedSearchParams.severity)
    : null;
  const viewport = computeInitialViewport(resolvedSearchParams);
  const supabase = getSupabaseServerClient();

  const [events, briefings, industriesResult, eventTypesResult] = await Promise.all([
    listPublicEvents({
      industry: resolvedSearchParams.industry,
      eventType: resolvedSearchParams.eventType,
      minSeverity: Number.isFinite(severityNumber) ? severityNumber : null,
      limit: 80,
      extractionMethods: ["heuristic_v3"],
    }),
    listPublicBriefings({
      industry: resolvedSearchParams.industry,
      limit: 12,
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
    <MapExplorer
      initialEvents={events}
      initialBriefings={briefings}
      industries={industriesResult.data ?? []}
      eventTypes={eventTypesResult.data ?? []}
      initialFilters={{
        industry: resolvedSearchParams.industry,
        eventType: resolvedSearchParams.eventType,
        severity: resolvedSearchParams.severity,
        selected: resolvedSearchParams.selected,
        briefing: resolvedSearchParams.briefing,
        centerLng: viewport.centerLng,
        centerLat: viewport.centerLat,
        zoom: viewport.zoom,
      }}
    />
  );
}
