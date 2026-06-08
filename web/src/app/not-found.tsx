import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
        Not found
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
        This route does not exist yet.
      </h1>
      <p className="text-base leading-7 text-[var(--color-muted-ink)]">
        The frontend foundation is in place, but this part of the product has
        not been implemented yet.
      </p>
      <div>
        <Link
          className="rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink-soft)]"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
