import Link from "next/link";
import { listPublicBriefings } from "@/lib/briefings";
import { listPublicEvents } from "@/lib/events";
import { SEVERITY_SCALE } from "@/lib/site";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default async function Home() {
  const [events, briefings] = await Promise.all([
    listPublicEvents({ limit: 4, extractionMethods: ["heuristic_v4", "heuristic_v3"] }),
    listPublicBriefings({ limit: 5 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 md:px-10 lg:px-12 lg:py-14">
      <section className="grid gap-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(16,34,56,0.96),rgba(8,20,34,0.92))] p-8 shadow-[0_30px_90px_var(--color-shadow)] lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
        <div className="space-y-6">
          <span className="inline-flex w-fit rounded-full border border-[var(--color-accent)]/30 bg-[rgba(76,143,217,0.16)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">
            Live industry intelligence
          </span>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
              Industry intelligence mapped, summarized, and kept current.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--color-ink-soft)]">
              IndustryMapper tracks supply-chain, policy, labor, energy, and semiconductor developments in one place.
              It pairs a live geographic event surface with weekly summaries and continuously refreshed source coverage
              so operators can scan what changed without digging through raw feeds.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/map"
              className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Open live map
            </Link>
            <Link
              href="/weekly"
              className="rounded-full border border-[var(--color-success)]/30 bg-[rgba(89,214,154,0.14)] px-5 py-3 text-sm font-semibold text-[var(--color-success)] transition hover:bg-[rgba(89,214,154,0.2)]"
            >
              Review weekly drafts
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              About IndustryMapper
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Live event count</p>
            <p className="mt-4 text-5xl font-semibold text-white">{events.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
              Mapped events currently visible from the live intelligence layer.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Weekly coverage sample</p>
            <p className="mt-4 text-5xl font-semibold text-white">{briefings.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
              Supporting articles currently retained for weekly intelligence and broader context.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-white/10 bg-[rgba(13,27,42,0.92)] p-7 shadow-[0_24px_70px_var(--color-shadow)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Core features</p>
            <h2 className="text-2xl font-semibold text-white">Built for fast scanning, geographic context, and weekly review.</h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--color-ink-soft)]">
              Use the interactive map to inspect event severity by location, open weekly summaries by industry for a fast
              editorial read, and keep track of both mapped events and supporting neutral coverage from current sources.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-[var(--color-ink-soft)] sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="font-semibold text-white">Interactive maps</p>
              <p className="mt-2 leading-7">Switch between flat and globe views, filter by industry and severity, and inspect mapped events in place.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="font-semibold text-white">Weekly summaries</p>
              <p className="mt-2 leading-7">Open industry-specific weekly drafts with event highlights, watchlists, source mix, and markdown output.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="font-semibold text-white">Up-to-date coverage</p>
              <p className="mt-2 leading-7">Fresh events and supporting articles are surfaced together so the map and summaries stay current.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(13,27,42,0.92)] p-7 shadow-[0_24px_70px_var(--color-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Event surface preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Latest mapped events</h2>
            </div>
            <Link href="/map" className="text-sm font-semibold text-[var(--color-accent-soft)] transition hover:text-white">
              Explore map
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {events.map((event) => {
              const severity = SEVERITY_SCALE.find((item) => item.level === event.severity_level) ?? SEVERITY_SCALE[0];
              const severe = event.severity_level === 5;
              return (
                <div
                  key={event.event_id}
                  className={`rounded-[1.4rem] border p-5 ${
                    severe
                      ? "border-white/70 bg-white text-slate-950"
                      : "border-white/10 bg-[rgba(255,255,255,0.04)] text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold leading-7">{event.title}</h3>
                    <span
                      className={`inline-flex min-w-14 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                        severe ? "border border-slate-300 bg-slate-950 text-white" : ""
                      }`}
                      style={severe ? undefined : { backgroundColor: `${severity.hex}22`, color: severity.hex }}
                    >
                      S{event.severity_level}
                    </span>
                  </div>
                  <p className={`mt-3 text-sm leading-7 ${severe ? "text-slate-700" : "text-[var(--color-ink-soft)]"}`}>
                    {event.summary}
                  </p>
                  <p className={`mt-4 text-xs uppercase tracking-[0.18em] ${severe ? "text-slate-500" : "text-[var(--color-muted-ink)]"}`}>
                    {formatDate(event.event_date)} · {event.country_name ?? event.location_name ?? "Unmapped"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(13,27,42,0.92)] p-7 shadow-[0_24px_70px_var(--color-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">Neutral intelligence</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Recent neutral headlines</h2>
            </div>
            <Link href="/map" className="text-sm font-semibold text-[var(--color-accent-soft)] transition hover:text-white">
              Review on map page
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {briefings.map((briefing) => (
              <a
                key={briefing.article_id}
                href={briefing.source_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-[1.35rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 transition hover:border-[var(--color-success)]/50 hover:bg-[rgba(89,214,154,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold leading-7 text-white">{briefing.title}</h3>
                  <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-success)]/30 bg-[rgba(89,214,154,0.14)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
                    ~
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
                  {briefing.summary ?? "No summary stored."}
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
                  {formatDate(briefing.published_at)} · {briefing.source_name}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
