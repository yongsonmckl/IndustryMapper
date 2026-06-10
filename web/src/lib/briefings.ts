import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PublicBriefing = {
  article_id: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  source_url: string;
  source_slug: string;
  source_name: string;
  industry_slug: "semiconductors" | "oil-gas" | null;
  enrichment_status: string;
};

export async function listPublicBriefings(filters?: {
  industry?: string | null;
  limit?: number;
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_public_briefings", {
    filter_industry_slug: filters?.industry ?? null,
    limit_count: filters?.limit ?? 12,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicBriefing[];
}
