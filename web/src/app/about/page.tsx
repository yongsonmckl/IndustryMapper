export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-8 shadow-[0_28px_80px_var(--color-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">About IndustryMapper</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-white">What the platform does.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-ink-soft)]">
          IndustryMapper is an intelligence surface for tracking supply-chain, policy, labor, geopolitical,
          and market developments across industries such as semiconductors and oil &amp; gas. It ingests current
          public reporting, turns map-worthy developments into structured events, and keeps broader supporting
          coverage available for weekly review.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-[1.6rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <h2 className="text-xl font-semibold text-white">Maps</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
            Structured events render on an interactive map or globe with severity markers, viewport-aware loading,
            persistent popups, and traceable links back to source reporting.
          </p>
        </article>
        <article className="rounded-[1.6rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <h2 className="text-xl font-semibold text-white">Weekly summaries</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
            Each industry can be reviewed through a collapsible weekly draft that combines mapped event highlights,
            supporting watchlist items, pattern readouts, and source mix in one place.
          </p>
        </article>
        <article className="rounded-[1.6rem] border border-white/10 bg-[rgba(13,27,42,0.94)] p-6">
          <h2 className="text-xl font-semibold text-white">Current coverage</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-soft)]">
            The platform is designed to stay current by pairing newly mapped events with supporting article coverage,
            so operators can understand both immediate incidents and the wider industry backdrop.
          </p>
        </article>
      </section>
    </div>
  );
}
