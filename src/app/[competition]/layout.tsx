import Link from "next/link";
import { competitionFrom, competitionParams } from "./competition";

export const generateStaticParams = competitionParams;

export default async function CompetitionLayout({ children, params }: LayoutProps<"/[competition]">) {
  const c = await competitionFrom(params);
  const base = `/${c.id}`;
  const nav =
    c.status === "live"
      ? [
          { href: base, label: "Overview" },
          { href: `${base}/players`, label: "Players" },
          { href: `${base}/fixtures`, label: "Fixtures" },
          { href: `${base}/scoring`, label: "Scoring" },
        ]
      : [
          { href: base, label: "Overview" },
          { href: `${base}/scoring`, label: "Scoring" },
        ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
        <p className="font-semibold">
          {c.name} {!c.name.includes(c.season) && <span className="font-normal text-muted">{c.season}</span>}
        </p>
        <nav className="flex gap-4 text-sm text-muted">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
