import Link from "next/link";
import { listPublicWeeklySummaries } from "@/lib/weekly-summaries";
import { SEVERITY_SCALE } from "@/lib/site";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  industry?: string;
}>;

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function reviewTone(status: "draft" | "reviewed" | "published") {
  if (status === "published") {
    return "border-[var(--color-success)]/40 bg-[rgba(89,214,154,0.12)] text-[var(--color-success)]";
  }
  if (status === "reviewed") {
    return "border-[var(--color-accent)]/40 bg-[rgba(76,143,217,0.12)] text-[var(--color-accent-soft)]";
  }
  return "border-[#f5c16c]/40 bg-[rgba(245,193,108,0.12)] text-[#f5c16c]";
}

export default async function WeeklyPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const summaries = await listPublicWeeklySummaries({
    industry: resolvedSearchParams.industry ?? null,
    limit: 8,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-10">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(16,34,56,0.96),rgba(8,20,34,0.92))] p-8 shadow-[0_30px_90px_var(--color-shadow)]">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Weekly intelligence drafts.
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[var(--color-ink-soft)]">
            Each industry summary stays collapsed until opened. Inside each draft you can review the current event
            highlights, the editorial watchlist, and the stored markdown version of the weekly briefing.
          </p>
        </div>
      </section>

      {summaries.length ? (
        <section className="grid gap-6">
          {summaries.map((summary) => {
            const dominantPattern = summary.summary_payload.event_patterns[0];
            const strongestEvent = summary.summary_payload.event_highlights[0];

            return (
              <details
                key={summary.summary_id}
                className="group rounded-[1.9rem] border border-white/10 bg-[rgba(13,27,42,0.94)] shadow-[0_22px_70px_var(--color-shadow)]"
              >
                <summary className="cursor-pointer list-none p-7">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
                          {summary.industry_name}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${reviewTone(summary.review_status)}`}
                        >
                          {summary.review_status}
                        </span>
                      </div>
                      <h2 className="text-3xl font-semibold tracking-tight text-white">{summary.title}</h2>
                      <p className="max-w-3xl text-base leading-8 text-[var(--color-ink-soft)]">
                        {summary.summary_payload.lead}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-[var(--color-muted-ink)]">
                        <span>{summary.summary_payload.week_label}</span>
                        {dominantPattern ? <span>{dominantPattern.label}</span> : null}
                        {strongestEvent?.source_name ? <span>{strongestEvent.source_name}</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">Confidence</p>
                        <p className="mt-2 font-semibold text-white">
                          {summary.confidence_score ? `${Math.round(Number(summary.confidence_score) * 100)}%` : "Unscored"}
                        </p>
                      </div>
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white/80 transition group-open:rotate-45">
                        +
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-white/10 px-7 pb-7 pt-6">
                  <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-7">
                      <section>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Event highlights</p>
                            <h3 className="mt-2 text-2xl font-semibold text-white">Structured map-side signals</h3>
                          </div>
                          <Link href="/map" className="text-sm font-semibold text-[var(--color-accent-soft)] transition hover:text-white">
                            Open map
                          </Link>
                        </div>
                        <div className="mt-5 grid gap-4">
                          {summary.summary_payload.event_highlights.length ? (
                            summary.summary_payload.event_highlights.map((event) => {
                              const severity = SEVERITY_SCALE.find((item) => item.level === event.severity_level) ?? SEVERITY_SCALE[0];
                              return (
                                <div key={event.event_id} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
                                        {event.event_type_name ? <span>{event.event_type_name}</span> : null}
                                        {event.subsector_name ? <span>{event.subsector_name}</span> : null}
                                      </div>
                                      <h4 className="mt-2 text-lg font-semibold text-white">{event.title}</h4>
                                    </div>
                                    <span
                                      className="inline-flex min-w-14 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                                      style={{ backgroundColor: severity.hex }}
                                    >
                                      S{event.severity_level}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">{event.summary}</p>
                                  <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted-ink)]">
                                    <span>{formatDate(event.event_date)}</span>
                                    {event.country_name || event.location_name ? <span>{event.country_name ?? event.location_name}</span> : null}
                                    {event.source_name ? <span>{event.source_name}</span> : null}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-[1.35rem] border border-dashed border-white/12 bg-white/4 p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
                              No mapped events were stored for this industry in the current weekly window.
                            </div>
                          )}
                        </div>
                      </section>

                      <section>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Draft markdown</p>
                        <pre className="mt-4 overflow-x-auto rounded-[1.35rem] border border-white/10 bg-[rgba(6,14,24,0.84)] p-5 text-sm leading-7 text-[var(--color-ink-soft)] whitespace-pre-wrap">
                          {summary.summary_markdown}
                        </pre>
                      </section>
                    </div>

                    <div className="space-y-7">
                      <section>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Neutral watchlist</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Items retained for editorial review</h3>
                        <div className="mt-5 grid gap-4">
                          {summary.summary_payload.watchlist.length ? (
                            summary.summary_payload.watchlist.map((item) => (
                              <a
                                key={item.article_id}
                                href={item.source_url ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5 transition hover:border-[var(--color-success)]/40 hover:bg-[rgba(89,214,154,0.08)]"
                              >
                                <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                                <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">{item.summary}</p>
                                <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted-ink)]">
                                  <span>{formatDate(item.published_at)}</span>
                                  {item.source_name ? <span>{item.source_name}</span> : null}
                                  {item.outcome_reason ? <span>{item.outcome_reason}</span> : null}
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="rounded-[1.35rem] border border-dashed border-white/12 bg-white/4 p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
                              No neutral-intelligence items were retained for this industry in the current weekly window.
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Pattern readout</p>
                          <div className="mt-4 grid gap-3">
                            {summary.summary_payload.event_patterns.length ? (
                              summary.summary_payload.event_patterns.map((pattern) => (
                                <div key={pattern.slug} className="flex items-center justify-between gap-4 text-sm">
                                  <span className="text-[var(--color-ink-soft)]">{pattern.label}</span>
                                  <span className="font-semibold text-white">{pattern.count}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm leading-7 text-[var(--color-ink-soft)]">No repeat event pattern surfaced in this window.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Source mix</p>
                          <div className="mt-4 grid gap-3">
                            {summary.summary_payload.source_mix.length ? (
                              summary.summary_payload.source_mix.map((source) => (
                                <div key={source.source_name} className="flex items-center justify-between gap-4 text-sm">
                                  <span className="text-[var(--color-ink-soft)]">{source.source_name}</span>
                                  <span className="font-semibold text-white">{source.count}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm leading-7 text-[var(--color-ink-soft)]">No source mix metadata was stored for this draft.</p>
                            )}
                          </div>
                        </div>
                      </section>

                      <details className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">How this summary was generated</p>
                              <p className="mt-2 text-sm font-semibold text-white">Open to inspect `weekly_v1` and related review metadata.</p>
                            </div>
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white/80">
                              +
                            </span>
                          </div>
                        </summary>
                        <div className="mt-4 grid gap-3 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[var(--color-ink-soft)]">Generated</span>
                            <span className="font-semibold text-white">{formatDate(summary.generated_at)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[var(--color-ink-soft)]">Version</span>
                            <span className="font-semibold text-white">{summary.generation_version}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[var(--color-ink-soft)]">Review state</span>
                            <span className="font-semibold text-white">{summary.review_status}</span>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[1.8rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-8 shadow-[0_24px_70px_var(--color-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Weekly intelligence</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">No weekly summaries stored yet</h2>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--color-ink-soft)]">
            The review surface is wired, but there are no generated weekly records yet. Run the weekly summary
            generator after the new migration is applied to populate the first draft set.
          </p>
        </section>
      )}
    </div>
  );
}
