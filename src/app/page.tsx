import Link from "next/link";
import { Card } from "@/components/ui";
import { COMPETITIONS } from "@/lib/competitions";

const steps = [
  { title: "Create a league", body: "Invite friends with a link. Free to play, no money involved." },
  { title: "Snake draft", body: "Take turns picking real players. Every player belongs to one team in your league." },
  { title: "Pick a formation", body: "Each matchup, start 11 in a 4-4-2 or 4-3-3 with a keeper, and choose a captain." },
  { title: "Win your matchup", body: "Players score points from their real games. Beat your opponent each week." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Draft fantasy football with your friends</h1>
        <p className="max-w-2xl text-muted">
          Draft a squad, set a lineup every round and go head-to-head. Points come from what your players actually do
          on the pitch.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Choose a game</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COMPETITIONS.map((c) => (
            <Link key={c.id} href={`/${c.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{c.name}</p>
                  {c.status === "live" ? (
                    <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Live</span>
                  ) : (
                    <span className="text-xs text-muted">Coming soon</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{c.description}</p>
              </Card>
            </Link>
          ))}
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
    </div>
  );
}
