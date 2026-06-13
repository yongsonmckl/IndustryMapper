import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { patchSupabaseAdminRow } from "@/lib/supabase/admin-rest";

type RouteContext = {
  params: Promise<{
    summaryId: string;
  }>;
};

type ReviewStatus = "draft" | "reviewed" | "published";

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "draft" || value === "reviewed" || value === "published";
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { summaryId } = await context.params;
    const body = (await request.json()) as { reviewStatus?: unknown };

    if (!isReviewStatus(body.reviewStatus)) {
      return NextResponse.json(
        { error: "Invalid review status." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const payload =
      body.reviewStatus === "draft"
        ? {
            review_status: "draft",
            reviewed_at: null,
            published_at: null,
          }
        : body.reviewStatus === "reviewed"
          ? {
              review_status: "reviewed",
              reviewed_at: now,
              published_at: null,
            }
          : {
              review_status: "published",
              reviewed_at: now,
              published_at: now,
            };

    const rows = await patchSupabaseAdminRow(
      "weekly_summaries",
      { id: `eq.${summaryId}` },
      payload,
    );

    revalidatePath("/weekly");

    return NextResponse.json({
      summary: rows[0] ?? null,
      reviewStatus: body.reviewStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update weekly summary status.",
      },
      { status: 500 },
    );
  }
}
