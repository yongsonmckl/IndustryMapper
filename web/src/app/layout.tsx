import type { Metadata } from "next";
import Link from "next/link";
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
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(6,14,24,0.84)] backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10 lg:px-12">
              <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.24em] text-white uppercase">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[rgba(61,127,181,0.18)] text-[var(--color-accent-soft)]">
                  IM
                </span>
                IndustryMapper
              </Link>
              <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm text-white/80">
                <Link href="/" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  Home
                </Link>
                <Link href="/map" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  Map
                </Link>
                <Link href="/about" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  About
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/10 bg-[rgba(5,11,20,0.95)]">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-[var(--color-muted-ink)] md:flex-row md:items-center md:justify-between md:px-10 lg:px-12">
              <p>Live geospatial industry intelligence for semiconductors and oil &amp; gas.</p>
              <div className="flex items-center gap-5">
                <Link href="/" className="transition hover:text-white">Home</Link>
                <Link href="/map" className="transition hover:text-white">Map</Link>
                <Link href="/about" className="transition hover:text-white">About</Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
