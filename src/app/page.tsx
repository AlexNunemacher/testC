import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Loading } from "@/components/ui";
import { currentMatchweek, matchweekFixtures } from "@/lib/queries";

const steps = [
  { title: "Create a league", body: "Invite friends with a link. Free to play, no money involved." },
  { title: "Snake draft", body: "Take turns picking real Premier League players. Every player belongs to one team." },
  { title: "Set your lineup", body: "Start 11 of your 15 in a legal formation and pick a captain before the deadline." },
  { title: "Win your matchup", body: "Players score points from their real games each matchweek. Beat your opponent." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Draft fantasy for the Premier League</h1>
        <p className="max-w-2xl text-muted">
          Draft your squad with friends, set a lineup each matchweek, and go head-to-head. Points come from what your
          players actually do on the pitch.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/players" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background">
            Browse players
          </Link>
          <Link href="/scoring" className="rounded-md border border-line px-4 py-2 text-sm font-medium">
            How scoring works
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Card key={s.title}>
            <p className="text-xs font-semibold text-accent">Step {i + 1}</p>
            <p className="mt-1 font-medium">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </Card>
        ))}
      </section>

      <section>
        <Suspense fallback={<Loading />}>
          <MatchweekSummary />
        </Suspense>
      </section>
    </div>
  );
}

async function MatchweekSummary() {
  await connection();
  const mw = await currentMatchweek();
  if (!mw) return null;
  const games = await matchweekFixtures(mw.id);
  const done = games.filter((g) => g.finished).length;
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold">{mw.name}</h2>
        <Link href={`/fixtures?mw=${mw.id}`} className="text-sm text-accent hover:underline">
          All fixtures →
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Deadline {mw.deadline.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}{" "}
        UK time · {done} of {games.length} games finished
      </p>
    </Card>
  );
}
