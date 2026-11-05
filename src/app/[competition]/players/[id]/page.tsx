import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, Positions } from "@/components/ui";
import { playerDetail } from "@/lib/queries";
import { liveCompetitionFrom } from "../../competition";

const STAT_LABEL: Record<string, string> = {
  appearance: "Minutes",
  fullMatch: "Full match",
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
  tackles: "Tackles",
  bonus: "Bonus",
  playerOfTheMatch: "Player of the match",
  defensiveContribution: "Defensive contribution",
};

type Params = PageProps<"/[competition]/players/[id]">["params"];

export default function PlayerPage({ params }: PageProps<"/[competition]/players/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <PlayerDetail params={params} />
    </Suspense>
  );
}

async function PlayerDetail({ params }: { params: Params }) {
  const c = await liveCompetitionFrom(params);
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const data = await playerDetail(c.id, id, c.scoring);
  if (!data) notFound();
  const { player, team, positions, games, total } = data;

  return (
    <div className="space-y-6">
      <Link href={`/${c.id}/players`} className="text-sm text-accent hover:underline">
        ← All players
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {player.firstName} {player.lastName}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-muted">
            <Positions positions={positions} /> {team.name}
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
                <th className="px-3 py-2">{c.roundLabel}</th>
                <th className="px-3 py-2">Opponent</th>
                <th className="px-3 py-2 text-right">Mins</th>
                <th className="px-3 py-2">Breakdown</th>
                <th className="px-3 py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.fixtureId} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{g.roundName}</td>
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
