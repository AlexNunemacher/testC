/**
 * Check how the scoring rules shape a draft, using synced real stats.
 *
 *   npm run balance                                  Premier League, 10-team league
 *   npm run balance -- premier-league --teams 12
 *
 * Draft value is points above a replacement-level player at the same position
 * (the best player left once every team has filled its usual starters), which
 * is what decides pick order far more than raw points.
 */
import { getCompetition } from "@/lib/competitions";
import { POSITIONS, type Position } from "@/lib/game/types";
import { playerTable } from "@/lib/queries";

async function main() {
  const slug = process.argv.slice(2).find((a) => !a.startsWith("--") && !/^\d+$/.test(a)) ?? "premier-league";
  const c = getCompetition(slug);
  if (!c) throw new Error(`Unknown competition "${slug}"`);
  // Starters per team in the competition's first formation (4-4-2 by default).
  const STARTERS = c.squad.formations[0].slots;

  const i = process.argv.indexOf("--teams");
  const teams = i === -1 ? 10 : Number(process.argv[i + 1]);
  if (!Number.isInteger(teams) || teams < 2) throw new Error("--teams needs a number of 2 or more");

  const rows = await playerTable(c.id, c.scoring);
  if (!rows.some((r) => r.points !== 0)) {
    console.log("No match stats yet. Run `npm run sync` first.");
    return;
  }

  const replacement = {} as Record<Position, number>;
  for (const pos of POSITIONS) {
    const sorted = rows.filter((r) => r.position === pos).sort((a, b) => b.points - a.points);
    replacement[pos] = sorted[teams * STARTERS[pos]]?.points ?? 0;
  }

  const ranked = rows
    .map((r) => ({ ...r, value: r.points - replacement[r.position] }))
    .sort((a, b) => b.value - a.value);

  console.log(`${c.name}, ${teams}-team league. Replacement level:`, replacement);
  console.log("\nPick  Pos  Player                 Team  Pts  Above repl.");
  ranked.slice(0, teams * 3).forEach((r, n) => {
    const round = Math.floor(n / teams) + 1;
    if (n % teams === 0) console.log(`--- round ${round} ---`);
    console.log(
      `${String(n + 1).padStart(4)}  ${r.position.padEnd(3)}  ${r.name.padEnd(22)} ${r.team.padEnd(4)} ${String(r.points).padStart(4)}  ${String(r.value).padStart(5)}`,
    );
  });

  console.log("\nFirst pick at each position:");
  for (const pos of POSITIONS) {
    const n = ranked.findIndex((r) => r.position === pos);
    if (n === -1) console.log(`  ${pos.padEnd(3)} no players`);
    else console.log(`  ${pos.padEnd(3)} pick ${n + 1} (${ranked[n].name}, ${ranked[n].team})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
