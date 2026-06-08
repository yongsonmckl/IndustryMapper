"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-bg)] text-[var(--color-ink)]">
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Application error
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Something broke before the page could render cleanly.
          </h1>
          <p className="text-base leading-7 text-[var(--color-muted-ink)]">
            The app hit an unexpected error. Reset the route and try again. If
            the issue persists, inspect the server logs and the failing data
            path.
          </p>
          {error.digest ? (
            <p className="text-sm text-[var(--color-muted-ink)]">
              Digest: {error.digest}
            </p>
          ) : null}
          <div>
            <button
              className="rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ink-soft)]"
              onClick={() => reset()}
              type="button"
            >
              Retry route
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
