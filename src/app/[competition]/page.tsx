import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Loading, NoData } from "@/components/ui";
import type { Competition } from "@/lib/competitions";
import { currentRound, roundFixtures } from "@/lib/queries";
import { competitionFrom } from "./competition";

export default async function CompetitionPage({ params }: PageProps<"/[competition]">) {
  const c = await competitionFrom(params);
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
        <p className="max-w-2xl text-muted">{c.description}</p>
      </section>
      {c.status === "live" ? (
        <Suspense fallback={<Loading />}>
          <RoundSummary competition={c} />
        </Suspense>
      ) : (
        <Card>
          <p className="font-medium">Coming soon</p>
          <p className="mt-1 text-sm text-muted">
            {c.name} isn&apos;t playable yet. The{" "}
            <Link href={`/${c.id}/scoring`} className="text-accent hover:underline">
              scoring rules
            </Link>{" "}
            are already set.
          </p>
        </Card>
      )}
    </div>
  );
}

async function RoundSummary({ competition: c }: { competition: Competition }) {
  await connection();
  const round = await currentRound(c.id);
  if (!round) return <NoData competition={c} />;
  const games = await roundFixtures(c.id, round.id);
  const done = games.filter((g) => g.finished).length;
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold">{round.name}</h2>
        <Link href={`/${c.id}/fixtures?round=${round.id}`} className="text-sm text-accent hover:underline">
          All fixtures →
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Deadline{" "}
        {round.deadline.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}{" "}
        UK time · {done} of {games.length} games finished
      </p>
    </Card>
  );
}
