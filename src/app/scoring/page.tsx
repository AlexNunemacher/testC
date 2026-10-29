import { Card } from "@/components/ui";
import { DEFAULT_SCORING as R, DEFAULT_SQUAD as S } from "@/lib/game/rules";
import { POSITIONS } from "@/lib/game/types";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const rows: [string, (p: (typeof POSITIONS)[number]) => string][] = [
  [`Playing 1–${R.longAppearanceMinutes - 1} minutes`, () => signed(R.appearance)],
  [`Playing ${R.longAppearanceMinutes}+ minutes`, () => signed(R.longAppearance)],
  ["Goal", (p) => signed(R.goal[p])],
  ["Assist", () => signed(R.assist)],
  [`Clean sheet (${R.cleanSheetMinutes}+ minutes)`, (p) => (R.cleanSheet[p] ? signed(R.cleanSheet[p]) : "–")],
  [`Every ${R.goalsConcededPer} goals conceded`, (p) => (R.goalsConceded[p] ? signed(R.goalsConceded[p]) : "–")],
  [`Every ${R.savesPer} saves`, (p) => (p === "GK" ? signed(R.saves) : "–")],
  ["Penalty saved", (p) => (p === "GK" ? signed(R.penaltySaved) : "–")],
  ["Penalty missed", () => signed(R.penaltyMissed)],
  [
    "Defensive contribution",
    (p) => (R.defensiveContributionThreshold[p] ? `${signed(R.defensiveContribution)} at ${R.defensiveContributionThreshold[p]}` : "–"),
  ],
  ["Bonus point (from FPL)", () => signed(R.bonus)],
  ["Yellow card", () => signed(R.yellowCard)],
  ["Red card", () => signed(R.redCard)],
  ["Own goal", () => signed(R.ownGoal)],
];

export default function ScoringPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">How scoring works</h1>
      <p className="max-w-2xl text-muted">
        Players earn points from each real Premier League game they play. If a club plays twice in a matchweek, both
        games count. Leagues can change these values.
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
            {S.rosterSize.FWD} forwards. Start 11: exactly 1 goalkeeper, at least {S.minStarters.DEF} defenders,{" "}
            {S.minStarters.MID} midfielders and {S.minStarters.FWD} forward.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Captain and substitutes</h2>
          <p className="mt-1 text-sm text-muted">
            Your captain scores double. If a starter doesn&apos;t play, the first bench player who did comes on, as long
            as the formation stays legal. Goalkeepers only swap with goalkeepers.
          </p>
        </Card>
      </div>
    </div>
  );
}
