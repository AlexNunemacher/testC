import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PositionBadge } from "@/components/ui";
import { playerDetail } from "@/lib/queries";

const STAT_LABEL: Record<string, string> = {
  appearance: "Minutes",
  goalsScored: "Goals",
  assists: "Assists",
  cleanSheets: "Clean sheet",
  goalsConceded: "Goals conceded",
  saves: "Saves",
  penaltiesSaved: "Penalty saved",
  penaltiesMissed: "Penalty missed",
  yellowCards: "Yellow card",
  redCards: "Red card",
  ownGoals: "Own goal",
  bonus: "Bonus",
  defensiveContribution: "Defensive contribution",
};

export default function PlayerPage({ params }: PageProps<"/players/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <PlayerDetail params={params} />
    </Suspense>
  );
}

async function PlayerDetail({ params }: { params: PageProps<"/players/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const data = await playerDetail(id);
  if (!data) notFound();
  const { player, club, games, total } = data;

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-sm text-accent hover:underline">
        ← All players
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {player.firstName} {player.lastName}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-muted">
            <PositionBadge position={player.position} /> {club.name}
          </p>
          {player.news && <p className="mt-2 text-sm text-amber-600">{player.news}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums">{total}</p>
          <p className="text-xs uppercase text-muted">Season points</p>
        </div>
      </div>

      {games.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No match stats yet.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">MW</th>
                <th className="px-3 py-2">Opponent</th>
                <th className="px-3 py-2 text-right">Mins</th>
                <th className="px-3 py-2">Breakdown</th>
                <th className="px-3 py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.fixtureId} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2 tabular-nums">{g.matchweekId}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {g.opponent} <span className="text-muted">({g.home ? "H" : "A"})</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.minutes}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {g.score.breakdown
                      .map((b) => `${STAT_LABEL[b.stat] ?? b.stat} ${b.points > 0 ? "+" : ""}${b.points}`)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{g.score.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
