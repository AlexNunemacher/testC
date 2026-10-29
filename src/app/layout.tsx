import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prem Draft",
  description: "Draft fantasy football for the Premier League: snake draft, weekly head-to-head matchups, points from real match stats.",
};

const nav = [
  { href: "/players", label: "Players" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/scoring", label: "Scoring" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Prem Draft
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line px-4 py-4 text-center text-xs text-muted">
          Free to play. Stats from the public Fantasy Premier League API. Not affiliated with the Premier League.
        </footer>
      </body>
    </html>
  );
}
