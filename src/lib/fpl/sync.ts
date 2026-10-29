import { and, eq, getTableColumns, lte, sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import { clubs, fixtures, matchweeks, playerFixtureStats, players } from "@/lib/db/schema";
import { fpl } from "./client";
import { positionMap, splitLiveStats } from "./transform";

const CHUNK = 200;

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

/** `SET col = excluded.col` for every column except the conflict target. */
function excludedSet(table: SQLiteTable, keep: string[] = []) {
  const set: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(getTableColumns(table)) as [string, SQLiteColumn][]) {
    if (col.primary || keep.includes(key)) continue;
    set[key] = sql.raw(`excluded."${col.name}"`);
  }
  return set;
}

/** Sync clubs, players, matchweeks and fixtures. Safe to run any time. */
export async function syncSeason() {
  const [bootstrap, fplFixtures] = await Promise.all([fpl.bootstrap(), fpl.fixtures()]);
  const positions = positionMap(bootstrap);
  const now = new Date();

  const clubRows = bootstrap.teams.map((t) => ({ id: t.id, name: t.name, shortName: t.short_name }));
  const playerRows = bootstrap.elements.flatMap((e) => {
    const position = positions.get(e.element_type);
    if (!position) return [];
    return [
      {
        id: e.id,
        firstName: e.first_name,
        lastName: e.second_name,
        webName: e.web_name,
        clubId: e.team,
        position,
        status: e.status,
        news: e.news ?? "",
        updatedAt: now,
      },
    ];
  });
  const matchweekRows = bootstrap.events.map((e) => ({
    id: e.id,
    name: e.name,
    deadline: new Date(e.deadline_time),
    finished: e.finished,
    isCurrent: e.is_current,
    isNext: e.is_next,
    dataChecked: e.data_checked,
  }));
  const fixtureRows = fplFixtures.map((f) => ({
    id: f.id,
    matchweekId: f.event,
    homeClubId: f.team_h,
    awayClubId: f.team_a,
    kickoff: f.kickoff_time ? new Date(f.kickoff_time) : null,
    started: f.started ?? false,
    finished: f.finished,
    homeScore: f.team_h_score,
    awayScore: f.team_a_score,
  }));

  await db.transaction(async (tx) => {
    for (const rows of chunks(clubRows)) {
      await tx.insert(clubs).values(rows).onConflictDoUpdate({ target: clubs.id, set: excludedSet(clubs) });
    }
    for (const rows of chunks(playerRows)) {
      await tx.insert(players).values(rows).onConflictDoUpdate({ target: players.id, set: excludedSet(players) });
    }
    for (const rows of chunks(matchweekRows)) {
      await tx
        .insert(matchweeks)
        .values(rows)
        .onConflictDoUpdate({ target: matchweeks.id, set: excludedSet(matchweeks, ["statsFinal"]) });
    }
    for (const rows of chunks(fixtureRows)) {
      await tx.insert(fixtures).values(rows).onConflictDoUpdate({ target: fixtures.id, set: excludedSet(fixtures) });
    }
  });

  return {
    clubs: clubRows.length,
    players: playerRows.length,
    matchweeks: matchweekRows.length,
    fixtures: fixtureRows.length,
  };
}

/** Replace one matchweek's player stats with the latest from FPL. */
export async function syncMatchweekStats(matchweekId: number) {
  const [live, mw] = await Promise.all([
    fpl.live(matchweekId),
    db.query.matchweeks.findFirst({ where: eq(matchweeks.id, matchweekId) }),
  ]);
  if (!mw) throw new Error(`Matchweek ${matchweekId} not found; run a season sync first`);

  const known = new Set((await db.select({ id: players.id }).from(players)).map((p) => p.id));
  const rows = splitLiveStats(live)
    .filter((l) => known.has(l.playerId))
    .map((l) => ({ ...l, matchweekId }));

  await db.transaction(async (tx) => {
    await tx.delete(playerFixtureStats).where(eq(playerFixtureStats.matchweekId, matchweekId));
    for (const chunk of chunks(rows)) await tx.insert(playerFixtureStats).values(chunk);
    if (mw.dataChecked) {
      await tx.update(matchweeks).set({ statsFinal: true }).where(eq(matchweeks.id, matchweekId));
    }
  });

  return rows.length;
}

/** Sync the season, then stats for every started matchweek that isn't final yet. */
export async function syncAll(log: (msg: string) => void = () => {}) {
  const season = await syncSeason();
  log(
    `Season: ${season.clubs} clubs, ${season.players} players, ${season.matchweeks} matchweeks, ${season.fixtures} fixtures`,
  );

  const pending = await db
    .select({ id: matchweeks.id })
    .from(matchweeks)
    .where(and(eq(matchweeks.statsFinal, false), lte(matchweeks.deadline, new Date())))
    .orderBy(matchweeks.id);

  for (const { id } of pending) {
    const n = await syncMatchweekStats(id);
    log(`Matchweek ${id}: ${n} stat lines`);
  }
}
