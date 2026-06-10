export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-8 shadow-[0_28px_80px_var(--color-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">About IndustryMapper</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-white">What this product is trying to prove.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-ink-soft)]">
          IndustryMapper is a map-first intelligence surface for structured supply-chain,
          policy, labor, and geopolitical developments across a narrow POC scope:
          semiconductors and oil &amp; gas. The system ingests curated public sources,
          extracts structured events, and separates map-worthy signals from broader
          neutral industry coverage.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-[1.6rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <h2 className="text-xl font-semibold text-white">Map layer</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
            High-confidence `heuristic_v3` events render on a live globe with viewport-aware loading,
            severity markers, and traceable links back to source articles.
          </p>
        </article>
        <article className="rounded-[1.6rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <h2 className="text-xl font-semibold text-white">Neutral intelligence</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
            Articles that are not promoted to the map are still useful. They now have a dedicated
            headline surface and are the seed material for future weekly summaries and newsletters.
          </p>
        </article>
        <article className="rounded-[1.6rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <h2 className="text-xl font-semibold text-white">Current focus</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
            The next quality step is recall tuning: keeping the map precise without losing real
            events that should be promoted from the `no_event` pool.
          </p>
        </article>
      </section>
    </div>
  );
}
