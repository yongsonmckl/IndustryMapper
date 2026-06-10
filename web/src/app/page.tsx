import Link from "next/link";
import { CURRENT_SCOPE, SEVERITY_SCALE } from "@/lib/site";
import { listPublicEvents, type PublicEvent } from "@/lib/events";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  industry?: string;
  severity?: string;
  selected?: string;
}>;

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function severityMeta(level: number) {
  return SEVERITY_SCALE.find((item) => item.level === level) ?? SEVERITY_SCALE[0];
}

function buildHref(industry: string | undefined, severity: string | undefined, selected?: string) {
  const params = new URLSearchParams();
  if (industry) params.set("industry", industry);
  if (severity) params.set("severity", severity);
  if (selected) params.set("selected", selected);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function EventCard({
  event,
  active,
  industry,
  severity,
}: {
  event: PublicEvent;
  active: boolean;
  industry?: string;
  severity?: string;
}) {
  const severityInfo = severityMeta(event.severity_level);

  return (
    <Link
      href={buildHref(industry, severity, event.event_id)}
      className={`block rounded-[1.35rem] border p-5 transition ${
        active
          ? "border-[var(--color-accent)] bg-white shadow-[0_18px_55px_rgba(16,33,44,0.08)]"
          : "border-black/8 bg-[var(--color-panel)] hover:border-black/14 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            <span>{event.industry_slug}</span>
            {event.event_type_slug ? <span>{event.event_type_slug}</span> : null}
          </div>
          <h3 className="text-lg font-semibold leading-7 text-[var(--color-ink)]">
            {event.title}
          </h3>
        </div>
        <span
          className="inline-flex min-w-14 items-center justify-center rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${severityInfo.hex}22`, color: severityInfo.hex }}
        >
          S{event.severity_level}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted-ink)] line-clamp-3">
        {event.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--color-muted-ink)]">
        <span>{formatDate(event.event_date)}</span>
        <span>{event.location_name ?? "Location pending"}</span>
        <span>{event.source_name}</span>
      </div>
    </Link>
  );
}

function DetailPanel({ event }: { event: PublicEvent | null }) {
  if (!event) {
    return (
      <section className="rounded-[1.8rem] border border-dashed border-black/12 bg-white/70 p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
          Event detail
        </p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          No event available yet
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-muted-ink)]">
          The ingestion and enrichment pipeline is active, but there are no public
          `heuristic_v2` events that match the current filters.
        </p>
      </section>
    );
  }

  const severityInfo = severityMeta(event.severity_level);

  return (
    <section className="rounded-[1.8rem] border border-black/8 bg-white p-8 shadow-[0_24px_70px_rgba(16,33,44,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
            <span>{event.industry_slug}</span>
            {event.subsector_slug ? <span>{event.subsector_slug}</span> : null}
            {event.event_type_slug ? <span>{event.event_type_slug}</span> : null}
          </div>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            {event.title}
          </h2>
        </div>
        <div
          className="rounded-2xl border border-black/8 px-4 py-3 text-right"
          style={{ backgroundColor: `${severityInfo.hex}14` }}
        >
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: severityInfo.hex }}>
            Severity
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
            {event.severity_level}
          </p>
          <p className="text-sm" style={{ color: severityInfo.hex }}>
            {severityInfo.label}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-[var(--color-soft)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            Date
          </p>
          <p className="mt-2 font-semibold text-[var(--color-ink)]">
            {formatDate(event.event_date)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--color-soft)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            Location
          </p>
          <p className="mt-2 font-semibold text-[var(--color-ink)]">
            {event.location_name ?? "Pending assignment"}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--color-soft)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            Confidence
          </p>
          <p className="mt-2 font-semibold text-[var(--color-ink)]">
            {Math.round(Number(event.confidence_score) * 100)}%
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--color-soft)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            Source
          </p>
          <p className="mt-2 font-semibold text-[var(--color-ink)]">{event.source_name}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Summary
          </p>
          <p className="mt-3 text-base leading-8 text-[var(--color-ink-soft)]">
            {event.summary}
          </p>

          <p className="mt-8 text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Evidence
          </p>
          <blockquote className="mt-3 rounded-[1.35rem] border border-black/8 bg-[var(--color-panel)] p-5 text-sm leading-7 text-[var(--color-ink-soft)]">
            {event.evidence_snippet ?? "No evidence snippet stored."}
          </blockquote>
        </div>

        <aside className="rounded-[1.5rem] border border-black/8 bg-[var(--color-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Traceability
          </p>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-[var(--color-muted-ink)]">Extraction</dt>
              <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                {event.extraction_method}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-ink)]">Source slug</dt>
              <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                {event.source_slug}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-ink)]">Reference article</dt>
              <dd className="mt-1">
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  Open source
                </a>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const industry = resolvedSearchParams.industry;
  const severity = resolvedSearchParams.severity;
  const selected = resolvedSearchParams.selected;
  const severityNumber = severity ? Number(severity) : null;

  const supabase = getSupabaseServerClient();
  const [events, industriesResult] = await Promise.all([
    listPublicEvents({
      industry,
      minSeverity: Number.isFinite(severityNumber) ? severityNumber : null,
      limit: 24,
    }),
    supabase.from("industries").select("slug,name").order("slug"),
  ]);

  if (industriesResult.error) {
    throw new Error(industriesResult.error.message);
  }

  const selectedEvent =
    events.find((event) => event.event_id === selected) ?? events[0] ?? null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-6 py-10 md:px-10 lg:px-12">
      <section className="grid gap-8 rounded-[2rem] border border-black/10 bg-[var(--color-panel)] p-8 shadow-[0_24px_80px_rgba(12,25,34,0.08)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-muted-ink)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            Live event console
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] md:text-6xl">
              Structured event intelligence, no longer a static scaffold.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--color-muted-ink)]">
              The app is now reading live `heuristic_v2` events from Supabase through a
              narrow public RPC. This is the first end-to-end event discovery surface for
              the semiconductors and oil & gas POC.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {CURRENT_SCOPE.map((item) => (
              <div
                key={item.title}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.6rem] bg-[var(--color-ink)] p-6 text-white">
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Visible live events
            </p>
            <p className="mt-4 text-5xl font-semibold">{events.length}</p>
            <p className="mt-2 text-sm leading-7 text-white/70">
              Filtered through a conservative extraction path so the UI is driven by
              event objects, not raw article noise.
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Filter state</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1">
                Industry: {industry ?? "all"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Min severity: {severity ?? "none"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.7rem] border border-black/8 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Industry
          </span>
          <Link
            href={buildHref(undefined, severity)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              !industry ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-soft)] text-[var(--color-ink)]"
            }`}
          >
            All
          </Link>
          {industriesResult.data?.map((item) => (
            <Link
              key={item.slug}
              href={buildHref(item.slug, severity)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                industry === item.slug
                  ? "bg-[var(--color-ink)] text-white"
                  : "bg-[var(--color-soft)] text-[var(--color-ink)]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
            Minimum severity
          </span>
          <Link
            href={buildHref(industry, undefined)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              !severity ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-soft)] text-[var(--color-ink)]"
            }`}
          >
            Any
          </Link>
          {SEVERITY_SCALE.map((level) => (
            <Link
              key={level.level}
              href={buildHref(industry, String(level.level))}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                severity === String(level.level)
                  ? "border-black/0 text-white"
                  : "border-black/8 bg-[var(--color-soft)] text-[var(--color-ink)]"
              }`}
              style={
                severity === String(level.level)
                  ? { backgroundColor: level.hex }
                  : undefined
              }
            >
              {level.level}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.event_id}
              event={event}
              active={selectedEvent?.event_id === event.event_id}
              industry={industry}
              severity={severity}
            />
          ))}
        </div>

        <DetailPanel event={selectedEvent} />
      </section>
    </main>
  );
}
