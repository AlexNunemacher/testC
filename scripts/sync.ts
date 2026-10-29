/**
 * Pull the latest Premier League data from the Fantasy Premier League API.
 *
 *   npm run sync                 season data + any matchweek stats not yet final
 *   npm run sync -- --matchweek 9   re-sync one matchweek's stats
 */
import { syncAll, syncMatchweekStats, syncSeason } from "@/lib/fpl/sync";

async function main() {
  const i = process.argv.indexOf("--matchweek");
  if (i !== -1) {
    const id = Number(process.argv[i + 1]);
    if (!Number.isInteger(id)) throw new Error("--matchweek needs a number");
    await syncSeason();
    console.log(`Matchweek ${id}: ${await syncMatchweekStats(id)} stat lines`);
    return;
  }
  await syncAll(console.log);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
