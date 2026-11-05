/**
 * Check how the scoring rules shape a draft, using synced real stats.
 *
 *   npm run balance                 10-team league
 *   npm run balance -- --teams 12
 *
 * Draft value is points above a replacement-level player at the same position
 * (the best player left once every team has filled its usual starters), which
 * is what decides pick order far more than raw points.
 */
import { DEFAULT_SCORING } from "@/lib/game/rules";
import type { Position } from "@/lib/game/types";
import { playerTable } from "@/lib/queries";

/** Typical starters per team (4-4-2 with 1 keeper). */
const STARTERS: Record<Position, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

async function main() {
  const i = process.argv.indexOf("--teams");
  const teams = i === -1 ? 10 : Number(process.argv[i + 1]);
  if (!Number.isInteger(teams) || teams < 2) throw new Error("--teams needs a number of 2 or more");

  const rows = await playerTable(DEFAULT_SCORING);
  if (!rows.some((r) => r.points !== 0)) {
    console.log("No match stats yet. Run `npm run sync` first.");
    return;
  }

  const replacement = {} as Record<Position, number>;
  for (const pos of Object.keys(STARTERS) as Position[]) {
    const sorted = rows.filter((r) => r.position === pos).sort((a, b) => b.points - a.points);
    replacement[pos] = sorted[teams * STARTERS[pos]]?.points ?? 0;
  }

  const ranked = rows
    .map((r) => ({ ...r, value: r.points - replacement[r.position] }))
    .sort((a, b) => b.value - a.value);

  console.log(`${teams}-team league. Replacement level:`, replacement);
  console.log("\nPick  Pos  Player                 Club  Pts  Above repl.");
  ranked.slice(0, teams * 3).forEach((r, n) => {
    const round = Math.floor(n / teams) + 1;
    if (n % teams === 0) console.log(`--- round ${round} ---`);
    console.log(
      `${String(n + 1).padStart(4)}  ${r.position.padEnd(3)}  ${r.name.padEnd(22)} ${r.club.padEnd(4)} ${String(r.points).padStart(4)}  ${String(r.value).padStart(5)}`,
    );
  });

  console.log("\nFirst pick at each position:");
  for (const pos of Object.keys(STARTERS) as Position[]) {
    const n = ranked.findIndex((r) => r.position === pos);
    if (n === -1) console.log(`  ${pos.padEnd(3)} no players`);
    else console.log(`  ${pos.padEnd(3)} pick ${n + 1} (${ranked[n].name}, ${ranked[n].club})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
