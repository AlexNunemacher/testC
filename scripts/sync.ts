/**
 * Pull the latest real-world data for each live competition.
 *
 *   npm run sync                                   every live competition
 *   npm run sync -- premier-league                 one competition
 *   npm run sync -- premier-league --round 9       re-sync one round's stats (provider's round number)
 */
import { and, eq } from "drizzle-orm";
import { getCompetition, liveCompetitions } from "@/lib/competitions";
import { db } from "@/lib/db";
import { rounds } from "@/lib/db/schema";
import { syncCompetition, syncRoundStats, syncSeason } from "@/lib/sync";

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  const targets = slug ? [getCompetition(slug)] : liveCompetitions();
  if (targets.some((c) => !c)) throw new Error(`Unknown competition "${slug}"`);

  const i = args.indexOf("--round");
  if (i !== -1) {
    const externalId = Number(args[i + 1]);
    if (!slug || !Number.isInteger(externalId)) throw new Error("Usage: npm run sync -- <competition> --round <number>");
    const c = targets[0]!;
    await syncSeason(c);
    const round = await db.query.rounds.findFirst({
      where: and(eq(rounds.competitionId, c.id), eq(rounds.externalId, externalId)),
    });
    if (!round) throw new Error(`${c.name} has no round ${externalId}`);
    console.log(`${c.name} ${round.name}: ${await syncRoundStats(c, round.id)} stat lines`);
    return;
  }

  for (const c of targets) await syncCompetition(c!, console.log);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
