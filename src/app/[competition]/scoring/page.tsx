import { Card } from "@/components/ui";
import { POSITIONS, type Position, type ScoringRules } from "@/lib/game/types";
import { competitionFrom } from "../competition";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const scoringRows = (R: ScoringRules): [string, (p: Position) => string][] => [
  [`Playing 1–${R.longAppearanceMinutes - 1} minutes`, () => signed(R.appearance)],
  [`Playing ${R.longAppearanceMinutes}+ minutes`, () => signed(R.longAppearance)],
  [`Starting and finishing the match (${R.fullMatchMinutes} minutes)`, (p) => (R.fullMatch[p] ? signed(R.fullMatch[p]) : "–")],
  ["Goal", (p) => signed(R.goal[p])],
  ["Assist", () => signed(R.assist)],
  [`Clean sheet (${R.cleanSheetMinutes}+ minutes)`, (p) => (R.cleanSheet[p] ? signed(R.cleanSheet[p]) : "–")],
  [`Every ${R.goalsConcededPer} goals conceded`, (p) => (R.goalsConceded[p] ? signed(R.goalsConceded[p]) : "–")],
  [`Every ${R.savesPer} saves`, (p) => (p === "GK" ? signed(R.saves) : "–")],
  ["Penalty saved", (p) => (p === "GK" ? signed(R.penaltySaved) : "–")],
  ["Penalty missed", () => signed(R.penaltyMissed)],
  [`Every ${R.tacklesPer} tackles`, (p) => (R.tackles[p] ? signed(R.tackles[p]) : "–")],
  ["Each FPL bonus point (top 3 in each match get 3, 2, 1)", () => signed(R.bonus)],
  ["Player of the match (highest match rating)", () => signed(R.playerOfTheMatch)],
  ["Yellow card", () => signed(R.yellowCard)],
  ["Red card", () => signed(R.redCard)],
  ["Own goal", () => signed(R.ownGoal)],
];

export default async function ScoringPage({ params }: PageProps<"/[competition]/scoring">) {
  const c = await competitionFrom(params);
  const S = c.squad;
  const rows = scoringRows(c.scoring);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">How scoring works</h1>
      <p className="max-w-2xl text-muted">
        Players earn points from each real {c.name} game they play.
        {c.kind === "league" && ` If a ${c.teamLabel.toLowerCase()} plays twice in a ${c.roundLabel.toLowerCase()}, both games count.`}{" "}
        Leagues can change these values.
      </p>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Event</th>
              {POSITIONS.map((p) => (
                <th key={p} className="px-3 py-2 text-center">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{label}</td>
                {POSITIONS.map((p) => (
                  <td key={p} className="px-3 py-2 text-center tabular-nums">
                    {value(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Squad</h2>
          <p className="mt-1 text-sm text-muted">
            {S.rosterSize.GK} goalkeepers, {S.rosterSize.DEF} defenders, {S.rosterSize.MID} midfielders and{" "}
            {S.rosterSize.FWD} forwards
            {S.maxPerTeam !== null && `, with at most ${S.maxPerTeam} from any one ${c.teamLabel.toLowerCase()}`}.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Formations</h2>
          <p className="mt-1 text-sm text-muted">
            Pick a formation for each matchup: {S.formations.map((f) => f.name).join(" or ")}, always with one
            goalkeeper. Players can play any position they&apos;re listed at, and score as that position.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Player of the match</h2>
          <p className="mt-1 text-sm text-muted">
            The player with the highest rating in each game, using FPL&apos;s Bonus Points System, which counts
            goals, assists, passes, tackles, saves and more. If two players tie, both get it.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Captain and substitutes</h2>
          <p className="mt-1 text-sm text-muted">
            Your captain scores double. If a starter doesn&apos;t play, the first bench player who did and is listed at
            the same position comes on, so your formation never changes. Goalkeepers only swap with goalkeepers.
          </p>
        </Card>
      </div>
    </div>
  );
}
