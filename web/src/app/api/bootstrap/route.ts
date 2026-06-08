import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const [industries, severityLevels, sources] = await Promise.all([
      supabase.from("industries").select("slug,name,description").order("slug"),
      supabase
        .from("severity_levels")
        .select("level,label,color_name,color_hex,description")
        .order("level"),
      supabase
        .from("sources")
        .select("slug,name,source_type,feed_url,homepage_url,reliability_tier")
        .order("reliability_tier", { ascending: false })
        .order("name"),
    ]);

    if (industries.error || severityLevels.error || sources.error) {
      throw new Error(
        industries.error?.message ||
          severityLevels.error?.message ||
          sources.error?.message ||
          "Failed to query bootstrap data.",
      );
    }

    return NextResponse.json({
      industries: industries.data,
      severityLevels: severityLevels.data,
      sources: sources.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bootstrap data unavailable.",
      },
      { status: 500 },
    );
  }
}
