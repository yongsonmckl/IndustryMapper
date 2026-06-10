import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PublicEvent = {
  event_id: string;
  title: string;
  summary: string;
  industry_slug: "semiconductors" | "oil-gas";
  subsector_slug: string | null;
  event_type_slug: string | null;
  severity_level: 0 | 1 | 2 | 3 | 4 | 5;
  confidence_score: string | number;
  event_status: string;
  event_date: string | null;
  detected_at: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  source_url: string;
  source_slug: string;
  source_name: string;
  evidence_snippet: string | null;
  extraction_method: string;
};

export async function listPublicEvents(filters?: {
  industry?: string | null;
  eventType?: string | null;
  minSeverity?: number | null;
  limit?: number;
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_public_events", {
    filter_industry_slug: filters?.industry ?? null,
    filter_event_type_slug: filters?.eventType ?? null,
    min_severity: filters?.minSeverity ?? null,
    limit_count: filters?.limit ?? 24,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicEvent[];
}
