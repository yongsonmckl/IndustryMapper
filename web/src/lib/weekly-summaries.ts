import { getSupabaseServerClient } from "@/lib/supabase/server";

export type WeeklySummaryEventItem = {
  event_id: string;
  title: string;
  summary: string;
  severity_level: number;
  confidence_score: number | string;
  event_date: string | null;
  event_type_slug: string | null;
  event_type_name: string | null;
  subsector_slug: string | null;
  subsector_name: string | null;
  location_name: string | null;
  city: string | null;
  admin1: string | null;
  country_name: string | null;
  source_name: string | null;
  source_slug: string | null;
  source_url: string | null;
  evidence_snippet: string | null;
};

export type WeeklySummaryBriefingItem = {
  article_id: string;
  title: string;
  summary: string;
  published_at: string | null;
  source_name: string | null;
  source_slug: string | null;
  source_url: string | null;
  industry_slug: string | null;
  industry_name: string | null;
  enrichment_status: string | null;
  outcome_reason: string | null;
};

export type WeeklySummaryPayload = {
  week_label: string;
  lead: string;
  counts: {
    event_count: number;
    neutral_count: number;
    severe_event_count: number;
  };
  event_highlights: WeeklySummaryEventItem[];
  watchlist: WeeklySummaryBriefingItem[];
  event_patterns: Array<{
    slug: string;
    label: string;
    count: number;
  }>;
  source_mix: Array<{
    source_name: string;
    count: number;
  }>;
};

export type PublicWeeklySummary = {
  summary_id: string;
  industry_slug: "semiconductors" | "oil-gas";
  industry_name: string;
  week_start_date: string;
  week_end_date: string;
  title: string;
  summary_markdown: string;
  summary_payload: WeeklySummaryPayload;
  source_event_count: number;
  neutral_article_count: number;
  review_status: "draft" | "reviewed" | "published";
  generation_version: string;
  confidence_score: string | number | null;
  generated_at: string;
  reviewed_at: string | null;
  published_at: string | null;
};

export async function listPublicWeeklySummaries(filters?: {
  industry?: string | null;
  limit?: number;
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_public_weekly_summaries", {
    filter_industry_slug: filters?.industry ?? null,
    limit_count: filters?.limit ?? 6,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicWeeklySummary[];
}
