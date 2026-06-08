import { APP_FOUNDATIONS, CURRENT_SCOPE, PIPELINE_STEPS, SEVERITY_SCALE } from "@/lib/site";

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] md:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-[var(--color-muted-ink)] md:text-lg">
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-6 py-10 md:px-10 lg:px-12">
      <section className="grid gap-10 rounded-[2rem] border border-black/10 bg-[var(--color-panel)] p-8 shadow-[0_24px_80px_rgba(12,25,34,0.08)] md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div className="space-y-8">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-muted-ink)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            Phase 1 Foundation
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] md:text-7xl">
              Industry disruptions, mapped into something operational.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--color-muted-ink)] md:text-xl">
              IndustryMapper turns trusted reporting and official notices into
              structured event intelligence for semiconductors and oil & gas,
              with geography, severity, and source traceability built in from
              the start.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink-soft)]"
              href="#foundation"
            >
              View the foundation
            </a>
            <a
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-black/20 hover:bg-[var(--color-soft)]"
              href="#severity"
            >
              Review the severity scale
            </a>
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.5rem] bg-[var(--color-ink)] p-6 text-white">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">
              Current scope
            </p>
            <div className="mt-4 grid gap-3">
              {CURRENT_SCOPE.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(122,162,255,0.16),rgba(255,255,255,0.04))] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">
              Core thesis
            </p>
            <p className="mt-4 text-xl font-semibold leading-8">
              Articles are evidence. Events are the product object.
            </p>
          </div>
        </div>
      </section>

      <section id="foundation" className="space-y-8">
        <SectionHeading
          eyebrow="Product foundation"
          title="A structure that can grow without needing a rewrite."
          description="The frontend, ingestion layer, and geospatial schema are being built as a thin but extensible platform. The first slice stays narrow, but the underlying contracts already assume future industries, more sources, and richer map behavior."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {APP_FOUNDATIONS.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.6rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(12,25,34,0.05)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                {item.kicker}
              </p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted-ink)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Pipeline"
          title="The first end-to-end path is intentionally narrow."
          description="The current build order prioritizes credibility and traceability over automation theater. The goal is a stable system that can ingest public sources, structure events, and expose them cleanly to the map layer."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {PIPELINE_STEPS.map((item, index) => (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-black/8 bg-[var(--color-panel)] p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-ink)]">
                Step {index + 1}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted-ink)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="severity"
        className="rounded-[2rem] border border-black/8 bg-white p-8 md:p-10"
      >
        <SectionHeading
          eyebrow="Severity"
          title="A shared risk language for the map and data model."
          description="Severity is stored as a stable numeric level from 0 to 5. The same level drives the database value, event interpretation, and map icon treatment so the UI does not drift from the data layer."
        />
        <div className="mt-8 grid gap-3">
          {SEVERITY_SCALE.map((level) => (
            <div
              key={level.level}
              className="grid gap-3 rounded-2xl border border-black/8 bg-[var(--color-soft)] p-4 md:grid-cols-[80px_160px_1fr]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: level.hex }}
                />
                <span className="text-2xl font-semibold text-[var(--color-ink)]">
                  {level.level}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{level.label}</p>
                <p className="text-sm text-[var(--color-muted-ink)]">{level.color}</p>
              </div>
              <p className="text-sm leading-7 text-[var(--color-muted-ink)]">
                {level.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
