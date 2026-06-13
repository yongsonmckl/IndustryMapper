"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type WeeklyReviewActionsProps = {
  summaryId: string;
  reviewStatus: "draft" | "reviewed" | "published";
};

type ReviewStatus = WeeklyReviewActionsProps["reviewStatus"];

export function WeeklyReviewActions({
  summaryId,
  reviewStatus,
}: WeeklyReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateStatus(nextStatus: ReviewStatus) {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch(
          `/api/weekly-summaries/${summaryId}/review-status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reviewStatus: nextStatus }),
          },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to update weekly status.");
        }

        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Failed to update weekly status.",
        );
      }
    });
  }

  const buttonClass =
    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || reviewStatus === "draft"}
          onClick={() => updateStatus("draft")}
          className={`${buttonClass} ${
            reviewStatus === "draft"
              ? "bg-[#f5c16c] text-slate-950"
              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Draft
        </button>
        <button
          type="button"
          disabled={isPending || reviewStatus === "reviewed"}
          onClick={() => updateStatus("reviewed")}
          className={`${buttonClass} ${
            reviewStatus === "reviewed"
              ? "bg-[var(--color-accent)] text-white"
              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Reviewed
        </button>
        <button
          type="button"
          disabled={isPending || reviewStatus === "published"}
          onClick={() => updateStatus("published")}
          className={`${buttonClass} ${
            reviewStatus === "published"
              ? "bg-[var(--color-success)] text-slate-950"
              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Published
        </button>
      </div>
      {error ? <p className="text-sm text-[#ff958a]">{error}</p> : null}
    </div>
  );
}
