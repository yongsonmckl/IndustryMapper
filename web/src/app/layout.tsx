import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndustryMapper",
  description:
    "Multi-industry geospatial news intelligence for structured event mapping and traceable risk monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--color-bg)] text-[var(--color-foreground)]">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-[120] border-b border-white/10 bg-[rgba(6,14,24,0.84)] backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10 lg:px-12">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.24em] text-white uppercase">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[rgba(61,127,181,0.18)] text-[var(--color-accent-soft)]">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                    <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3.75 12h16.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M12 3.75c2.2 2.25 3.3 5 3.3 8.25S14.2 18 12 20.25C9.8 18 8.7 15.25 8.7 12S9.8 6 12 3.75Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.5 7.75c1.9 1.1 4.1 1.65 6.5 1.65s4.6-.55 6.5-1.65" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    <path d="M5.5 16.25c1.9-1.1 4.1-1.65 6.5-1.65s4.6.55 6.5 1.65" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </span>
                IndustryMapper
              </a>
              <nav className="relative z-[121] flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm text-white/80">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  Home
                </a>
                <a href="/map" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  Map
                </a>
                <a href="/weekly" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  Weekly
                </a>
                <a href="/about" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  About
                </a>
              </nav>
            </div>
          </header>
          <main className="relative z-0 flex-1">{children}</main>
          <footer className="relative z-[120] border-t border-white/10 bg-[rgba(5,11,20,0.95)]">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-[var(--color-muted-ink)] md:flex-row md:items-center md:justify-between md:px-10 lg:px-12">
              <p>Live geospatial industry intelligence for semiconductors and oil &amp; gas.</p>
              <div className="flex items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className="transition hover:text-white">Home</a>
                <a href="/map" className="transition hover:text-white">Map</a>
                <a href="/weekly" className="transition hover:text-white">Weekly</a>
                <a href="/about" className="transition hover:text-white">About</a>
                <a
                  href="https://github.com/yongsonmckl/IndustryMapper"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-white"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
