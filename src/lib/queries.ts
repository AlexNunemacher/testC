import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clubs, fixtures, matchweeks, playerFixtureStats, players } from "@/lib/db/schema";
import { DEFAULT_SCORING } from "@/lib/game/rules";
import { scoreStatLine } from "@/lib/game/scoring";
import type { Position, ScoringRules } from "@/lib/game/types";

export interface PlayerRow {
  id: number;
  name: string;
  fullName: string;
  position: Position;
  club: string;
  clubId: number;
  status: string;
  news: string;
  apps: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  points: number;
}

/** Every player with season totals, scored with the given rules. */
export async function playerTable(rules: ScoringRules = DEFAULT_SCORING): Promise<PlayerRow[]> {
  const [rows, stats] = await Promise.all([
    db
      .select({ player: players, club: clubs.shortName })
      .from(players)
      .innerJoin(clubs, eq(players.clubId, clubs.id)),
    db.select().from(playerFixtureStats),
  ]);

  const byPlayer = new Map<number, PlayerRow>();
  for (const { player: p, club } of rows) {
    byPlayer.set(p.id, {
      id: p.id,
      name: p.webName,
      fullName: `${p.firstName} ${p.lastName}`,
      position: p.position,
      club,
      clubId: p.clubId,
      status: p.status,
      news: p.news,
      apps: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      points: 0,
    });
  }
  for (const s of stats) {
    const row = byPlayer.get(s.playerId);
    if (!row) continue;
    if (s.minutes > 0) row.apps++;
    row.minutes += s.minutes;
    row.goals += s.goalsScored;
    row.assists += s.assists;
    row.cleanSheets += s.cleanSheets;
    row.points += scoreStatLine(row.position, s, rules).points;
  }
  return [...byPlayer.values()];
}

export async function allClubs() {
  return db.select().from(clubs).orderBy(asc(clubs.name));
}

export async function allMatchweeks() {
  return db.select().from(matchweeks).orderBy(asc(matchweeks.id));
}

/** The matchweek in progress, else the next one, else the last one. */
export async function currentMatchweek() {
  const all = await allMatchweeks();
  return all.find((m) => m.isCurrent) ?? all.find((m) => m.isNext) ?? all.at(-1) ?? null;
}

export async function matchweekFixtures(matchweekId: number) {
  const rows = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.matchweekId, matchweekId))
    .orderBy(asc(fixtures.kickoff), asc(fixtures.id));
  const clubNames = new Map((await allClubs()).map((c) => [c.id, c]));
  return rows.map((f) => ({ ...f, home: clubNames.get(f.homeClubId)!, away: clubNames.get(f.awayClubId)! }));
}

/** A player's profile with a per-fixture points breakdown. */
export async function playerDetail(id: number, rules: ScoringRules = DEFAULT_SCORING) {
  const row = await db
    .select({ player: players, club: clubs })
    .from(players)
    .innerJoin(clubs, eq(players.clubId, clubs.id))
    .where(eq(players.id, id))
    .get();
  if (!row) return null;

  const stats = await db
    .select()
    .from(playerFixtureStats)
    .where(eq(playerFixtureStats.playerId, id))
    .orderBy(asc(playerFixtureStats.matchweekId), asc(playerFixtureStats.fixtureId));

  const fixtureRows = stats.length
    ? await db.select().from(fixtures).where(inArray(fixtures.id, stats.map((s) => s.fixtureId)))
    : [];
  const fixtureById = new Map(fixtureRows.map((f) => [f.id, f]));
  const clubById = new Map((await allClubs()).map((c) => [c.id, c]));

  const games = stats.map((s) => {
    const f = fixtureById.get(s.fixtureId);
    const home = f?.homeClubId === row.player.clubId;
    const opponentId = f ? (home ? f.awayClubId : f.homeClubId) : null;
    return {
      ...s,
      opponent: opponentId ? clubById.get(opponentId)?.shortName ?? "?" : "?",
      home,
      score: scoreStatLine(row.player.position, s, rules),
    };
  });

  return {
    player: row.player,
    club: row.club,
    games,
    total: games.reduce((sum, g) => sum + g.score.points, 0),
  };
}
