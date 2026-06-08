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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
