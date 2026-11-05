import { and, eq, getTableColumns, lte, sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Competition } from "@/lib/competitions";
import { db } from "@/lib/db";
import { competitions, fixtures, playerFixtureStats, players, realTeams, rounds } from "@/lib/db/schema";
import type { DataProvider } from "@/lib/providers/types";

const CHUNK = 200;

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

/** `SET col = excluded.col` for every column except the key and `keep`. */
function excludedSet(table: SQLiteTable, keep: string[] = []) {
  const set: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(getTableColumns(table)) as [string, SQLiteColumn][]) {
    if (col.primary || keep.includes(key)) continue;
    set[key] = sql.raw(`excluded."${col.name}"`);
  }
  return set;
}

/** Map provider ids to database ids for one table in one competition. */
async function idMap(table: typeof realTeams | typeof players | typeof rounds | typeof fixtures, competitionId: string) {
  const rows = await db
    .select({ id: table.id, externalId: table.externalId })
    .from(table)
    .where(eq(table.competitionId, competitionId));
  return new Map(rows.map((r) => [r.externalId, r.id]));
}

function lookup(map: Map<number, number>, externalId: number, what: string): number {
  const id = map.get(externalId);
  if (id === undefined) throw new Error(`Unknown ${what} ${externalId} from provider`);
  return id;
}

function providerOf(c: Competition): DataProvider {
  if (!c.provider) throw new Error(`${c.name} has no data provider yet`);
  return c.provider;
}

/** Sync a competition's teams, players, rounds and fixtures. Safe to run any time. */
export async function syncSeason(c: Competition) {
  const season = await providerOf(c).fetchSeason();
  const competitionId = c.id;
  const scoped = { competitionId };
  const conflict = (t: typeof realTeams | typeof players | typeof rounds | typeof fixtures) => [
    t.competitionId,
    t.externalId,
  ];

  await db
    .insert(competitions)
    .values({ id: c.id, name: c.name, kind: c.kind, season: c.season })
    .onConflictDoUpdate({ target: competitions.id, set: excludedSet(competitions) });

  for (const rows of chunks(season.teams.map((t) => ({ ...scoped, ...t })))) {
    await db.insert(realTeams).values(rows).onConflictDoUpdate({ target: conflict(realTeams), set: excludedSet(realTeams) });
  }
  const teamIds = await idMap(realTeams, competitionId);

  const now = new Date();
  const playerRows = season.players.map(({ teamExternalId, ...p }) => ({
    ...scoped,
    ...p,
    realTeamId: lookup(teamIds, teamExternalId, "team"),
    updatedAt: now,
  }));
  const roundRows = season.rounds.map((r) => ({ ...scoped, ...r }));

  await db.transaction(async (tx) => {
    for (const rows of chunks(playerRows)) {
      await tx.insert(players).values(rows).onConflictDoUpdate({ target: conflict(players), set: excludedSet(players) });
    }
    for (const rows of chunks(roundRows)) {
      await tx
        .insert(rounds)
        .values(rows)
        .onConflictDoUpdate({ target: conflict(rounds), set: excludedSet(rounds, ["statsFinal"]) });
    }
  });

  const roundIds = await idMap(rounds, competitionId);
  const fixtureRows = season.fixtures.map(({ roundExternalId, homeTeamExternalId, awayTeamExternalId, ...f }) => ({
    ...scoped,
    ...f,
    roundId: roundExternalId === null ? null : lookup(roundIds, roundExternalId, "round"),
    homeTeamId: lookup(teamIds, homeTeamExternalId, "team"),
    awayTeamId: lookup(teamIds, awayTeamExternalId, "team"),
  }));
  await db.transaction(async (tx) => {
    for (const rows of chunks(fixtureRows)) {
      await tx.insert(fixtures).values(rows).onConflictDoUpdate({ target: conflict(fixtures), set: excludedSet(fixtures) });
    }
  });

  return {
    teams: season.teams.length,
    players: playerRows.length,
    rounds: roundRows.length,
    fixtures: fixtureRows.length,
  };
}

/** Replace one round's player stats with the provider's latest. */
export async function syncRoundStats(c: Competition, roundId: number) {
  const round = await db.query.rounds.findFirst({
    where: and(eq(rounds.id, roundId), eq(rounds.competitionId, c.id)),
  });
  if (!round) throw new Error(`${c.name} round ${roundId} not found; run a season sync first`);

  const [lines, playerIds, fixtureIds] = await Promise.all([
    providerOf(c).fetchRoundStats(round.externalId),
    idMap(players, c.id),
    idMap(fixtures, c.id),
  ]);
  // Players the provider no longer lists (e.g. left mid-season) are skipped.
  const rows = lines.flatMap(({ playerExternalId, fixtureExternalId, ...stats }) => {
    const playerId = playerIds.get(playerExternalId);
    if (playerId === undefined) return [];
    return [{ ...stats, playerId, fixtureId: lookup(fixtureIds, fixtureExternalId, "fixture"), roundId }];
  });

  await db.transaction(async (tx) => {
    await tx.delete(playerFixtureStats).where(eq(playerFixtureStats.roundId, roundId));
    for (const chunk of chunks(rows)) await tx.insert(playerFixtureStats).values(chunk);
    if (round.dataChecked) await tx.update(rounds).set({ statsFinal: true }).where(eq(rounds.id, roundId));
  });

  return rows.length;
}

/** Sync a competition's season, then stats for every started round that isn't final yet. */
export async function syncCompetition(c: Competition, log: (msg: string) => void = () => {}) {
  const season = await syncSeason(c);
  log(`${c.name}: ${season.teams} teams, ${season.players} players, ${season.rounds} rounds, ${season.fixtures} fixtures`);

  const pending = await db
    .select({ id: rounds.id, name: rounds.name })
    .from(rounds)
    .where(and(eq(rounds.competitionId, c.id), eq(rounds.statsFinal, false), lte(rounds.deadline, new Date())))
    .orderBy(rounds.deadline);

  for (const r of pending) {
    log(`${c.name} ${r.name}: ${await syncRoundStats(c, r.id)} stat lines`);
  }
}
