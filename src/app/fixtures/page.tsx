import Link from "next/link";
import { Suspense } from "react";
import { Card, Loading, NoData } from "@/components/ui";
import { allMatchweeks, currentMatchweek, matchweekFixtures } from "@/lib/queries";

export default function FixturesPage({ searchParams }: PageProps<"/fixtures">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Fixtures</h1>
      <Suspense fallback={<Loading />}>
        <FixtureList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const ukTime = (d: Date) =>
  d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

async function FixtureList({ searchParams }: { searchParams: PageProps<"/fixtures">["searchParams"] }) {
  const requested = Number((await searchParams).mw);
  const [weeks, current] = await Promise.all([allMatchweeks(), currentMatchweek()]);
  if (weeks.length === 0 || !current) return <NoData />;

  const mw = weeks.find((w) => w.id === requested) ?? current;
  const games = await matchweekFixtures(mw.id);
  const prev = weeks.find((w) => w.id === mw.id - 1);
  const next = weeks.find((w) => w.id === mw.id + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {prev ? <Link href={`/fixtures?mw=${prev.id}`} className="text-sm text-accent hover:underline">← {prev.name}</Link> : <span />}
        <h2 className="font-semibold">{mw.name}</h2>
        {next ? <Link href={`/fixtures?mw=${next.id}`} className="text-sm text-accent hover:underline">{next.name} →</Link> : <span />}
      </div>
      <p className="text-center text-sm text-muted">Deadline {ukTime(mw.deadline)} UK time</p>

      {games.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No fixtures in this matchweek.</p>
        </Card>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {games.map((g) => (
            <li key={g.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 text-sm">
              <span className="text-right font-medium">{g.home.name}</span>
              <span className="min-w-20 text-center tabular-nums">
                {g.started && g.homeScore !== null ? (
                  <span className={g.finished ? "font-semibold" : "font-semibold text-good"}>
                    {g.homeScore} – {g.awayScore}
                  </span>
                ) : (
                  <span className="text-xs text-muted">{g.kickoff ? ukTime(g.kickoff) : "TBC"}</span>
                )}
              </span>
              <span className="font-medium">{g.away.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
