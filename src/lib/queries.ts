import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, playerFixtureStats, playerPositions, players, realTeams, rounds } from "@/lib/db/schema";
import { scoreStatLine } from "@/lib/game/scoring";
import { POSITIONS, type Position, type ScoringRules } from "@/lib/game/types";

export interface PlayerRow {
  id: number;
  name: string;
  fullName: string;
  /** Main position. */
  position: Position;
  /** Every position the player is listed at, main position first. */
  positions: Position[];
  team: string;
  realTeamId: number;
  status: string;
  news: string;
  apps: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  tackles: number;
  /** Season points at the player's main position. */
  points: number;
}

/** Each player's listed positions: main position first, then extras in standard order. */
async function listedPositions(competitionId: string): Promise<Map<number, Position[]>> {
  const [main, extra] = await Promise.all([
    db.select({ id: players.id, position: players.position }).from(players).where(eq(players.competitionId, competitionId)),
    db
      .select({ id: playerPositions.playerId, position: playerPositions.position })
      .from(playerPositions)
      .innerJoin(players, eq(players.id, playerPositions.playerId))
      .where(eq(players.competitionId, competitionId)),
  ]);
  const map = new Map(main.map((p) => [p.id, [p.position]]));
  for (const e of extra) {
    const list = map.get(e.id);
    if (list && !list.includes(e.position)) list.push(e.position);
  }
  for (const list of map.values()) {
    list.splice(1, list.length - 1, ...list.slice(1).sort((a, b) => POSITIONS.indexOf(a) - POSITIONS.indexOf(b)));
  }
  return map;
}

/** Every player in a competition with season totals, scored with the given rules. */
export async function playerTable(competitionId: string, rules: ScoringRules): Promise<PlayerRow[]> {
  const [rows, stats, positions] = await Promise.all([
    db
      .select({ player: players, team: realTeams.shortName })
      .from(players)
      .innerJoin(realTeams, eq(players.realTeamId, realTeams.id))
      .where(eq(players.competitionId, competitionId)),
    db
      .select({ stats: playerFixtureStats })
      .from(playerFixtureStats)
      .innerJoin(players, eq(players.id, playerFixtureStats.playerId))
      .where(eq(players.competitionId, competitionId)),
    listedPositions(competitionId),
  ]);

  const byPlayer = new Map<number, PlayerRow>();
  for (const { player: p, team } of rows) {
    byPlayer.set(p.id, {
      id: p.id,
      name: p.webName,
      fullName: `${p.firstName} ${p.lastName}`,
      position: p.position,
      positions: positions.get(p.id) ?? [p.position],
      team,
      realTeamId: p.realTeamId,
      status: p.status,
      news: p.news,
      apps: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      tackles: 0,
      points: 0,
    });
  }
  for (const { stats: s } of stats) {
    const row = byPlayer.get(s.playerId);
    if (!row) continue;
    if (s.minutes > 0) row.apps++;
    row.minutes += s.minutes;
    row.goals += s.goalsScored;
    row.assists += s.assists;
    row.cleanSheets += s.cleanSheets;
    row.tackles += s.tackles;
    row.points += scoreStatLine(row.position, s, rules).points;
  }
  return [...byPlayer.values()];
}

export async function competitionTeams(competitionId: string) {
  return db.select().from(realTeams).where(eq(realTeams.competitionId, competitionId)).orderBy(asc(realTeams.name));
}

export async function competitionRounds(competitionId: string) {
  return db.select().from(rounds).where(eq(rounds.competitionId, competitionId)).orderBy(asc(rounds.deadline));
}

/** The round in progress, else the next one, else the last one. */
export async function currentRound(competitionId: string) {
  const all = await competitionRounds(competitionId);
  return all.find((r) => r.isCurrent) ?? all.find((r) => r.isNext) ?? all.at(-1) ?? null;
}

export async function roundFixtures(competitionId: string, roundId: number) {
  const [rows, teams] = await Promise.all([
    db
      .select()
      .from(fixtures)
      .where(eq(fixtures.roundId, roundId))
      .orderBy(asc(fixtures.kickoff), asc(fixtures.id)),
    competitionTeams(competitionId),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  return rows.map((f) => ({ ...f, home: teamById.get(f.homeTeamId)!, away: teamById.get(f.awayTeamId)! }));
}

/** A player's profile with a per-fixture points breakdown at their main position. */
export async function playerDetail(competitionId: string, id: number, rules: ScoringRules) {
  const row = await db
    .select({ player: players, team: realTeams })
    .from(players)
    .innerJoin(realTeams, eq(players.realTeamId, realTeams.id))
    .where(and(eq(players.id, id), eq(players.competitionId, competitionId)))
    .get();
  if (!row) return null;

  const [stats, positions, teams] = await Promise.all([
    db
      .select({ stats: playerFixtureStats, roundName: rounds.name })
      .from(playerFixtureStats)
      .innerJoin(rounds, eq(rounds.id, playerFixtureStats.roundId))
      .where(eq(playerFixtureStats.playerId, id))
      .orderBy(asc(rounds.deadline), asc(playerFixtureStats.fixtureId)),
    listedPositions(competitionId),
    competitionTeams(competitionId),
  ]);

  const fixtureRows = stats.length
    ? await db.select().from(fixtures).where(inArray(fixtures.id, stats.map((s) => s.stats.fixtureId)))
    : [];
  const fixtureById = new Map(fixtureRows.map((f) => [f.id, f]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const games = stats.map(({ stats: s, roundName }) => {
    const f = fixtureById.get(s.fixtureId);
    const home = f?.homeTeamId === row.player.realTeamId;
    const opponentId = f ? (home ? f.awayTeamId : f.homeTeamId) : null;
    return {
      ...s,
      roundName,
      opponent: opponentId ? (teamById.get(opponentId)?.shortName ?? "?") : "?",
      home,
      score: scoreStatLine(row.player.position, s, rules),
    };
  });

  return {
    player: row.player,
    team: row.team,
    positions: positions.get(id) ?? [row.player.position],
    games,
    total: games.reduce((sum, g) => sum + g.score.points, 0),
  };
}
