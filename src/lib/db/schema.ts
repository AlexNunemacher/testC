import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { Position, ScoringRules, SquadRules } from "@/lib/game/types";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

// ---------------------------------------------------------------------------
// Real-world data, synced from each competition's data provider. Every row
// belongs to a competition (Premier League, La Liga, World Cup, ...) and keeps
// the provider's own id in `external_id` so syncs can upsert.
// ---------------------------------------------------------------------------

/** Mirrors the competition registry in src/lib/competitions.ts. */
export const competitions = sqliteTable("competitions", {
  /** Slug, e.g. "premier-league". */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").$type<"league" | "tournament">().notNull(),
  season: text("season").notNull(),
});

/** A real-world team: a club in a league, a nation in an international tournament. */
export const realTeams = sqliteTable(
  "real_teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    externalId: integer("external_id").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
  },
  (t) => [uniqueIndex("real_teams_ext_uq").on(t.competitionId, t.externalId)],
);

export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    externalId: integer("external_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    webName: text("web_name").notNull(),
    realTeamId: integer("real_team_id")
      .notNull()
      .references(() => realTeams.id),
    /** Main position, from the provider. Roster limits count this position. */
    position: text("position").$type<Position>().notNull(),
    /** Availability: a=available, d=doubtful, i=injured, s=suspended, u=unavailable, n=not in squad. */
    status: text("status").notNull(),
    news: text("news").notNull().default(""),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("players_ext_uq").on(t.competitionId, t.externalId),
    index("players_team_idx").on(t.realTeamId),
  ],
);

/**
 * Extra positions a player is listed at, on top of their main position, so
 * managers can switch them in a lineup (e.g. a wing-back listed at DEF and MID).
 * Not touched by syncs, so manual listings survive.
 */
export const playerPositions = sqliteTable(
  "player_positions",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    position: text("position").$type<Position>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.position] })],
);

/** A scoring period: a matchweek in a league, a matchday or knockout round in a tournament. */
export const rounds = sqliteTable(
  "rounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    externalId: integer("external_id").notNull(),
    name: text("name").notNull(),
    /** Tournament stage, e.g. "Group stage" or "Quarter-finals"; null in leagues. */
    stage: text("stage"),
    deadline: integer("deadline", { mode: "timestamp" }).notNull(),
    finished: integer("finished", { mode: "boolean" }).notNull(),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull(),
    isNext: integer("is_next", { mode: "boolean" }).notNull(),
    /** The provider has confirmed the stats; no more corrections expected. */
    dataChecked: integer("data_checked", { mode: "boolean" }).notNull(),
    /** We synced stats after dataChecked became true, so they never need re-syncing. */
    statsFinal: integer("stats_final", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("rounds_ext_uq").on(t.competitionId, t.externalId)],
);

export const fixtures = sqliteTable(
  "fixtures",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    externalId: integer("external_id").notNull(),
    /** null while a postponed fixture has no new date. */
    roundId: integer("round_id").references(() => rounds.id),
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => realTeams.id),
    awayTeamId: integer("away_team_id")
      .notNull()
      .references(() => realTeams.id),
    kickoff: integer("kickoff", { mode: "timestamp" }),
    started: integer("started", { mode: "boolean" }).notNull(),
    finished: integer("finished", { mode: "boolean" }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
  },
  (t) => [
    uniqueIndex("fixtures_ext_uq").on(t.competitionId, t.externalId),
    index("fixtures_round_idx").on(t.roundId),
  ],
);

export const playerFixtureStats = sqliteTable(
  "player_fixture_stats",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    fixtureId: integer("fixture_id")
      .notNull()
      .references(() => fixtures.id),
    roundId: integer("round_id")
      .notNull()
      .references(() => rounds.id),
    minutes: integer("minutes").notNull(),
    starts: integer("starts").notNull().default(0),
    goalsScored: integer("goals_scored").notNull(),
    assists: integer("assists").notNull(),
    cleanSheets: integer("clean_sheets").notNull(),
    goalsConceded: integer("goals_conceded").notNull(),
    ownGoals: integer("own_goals").notNull(),
    penaltiesSaved: integer("penalties_saved").notNull(),
    penaltiesMissed: integer("penalties_missed").notNull(),
    yellowCards: integer("yellow_cards").notNull(),
    redCards: integer("red_cards").notNull(),
    saves: integer("saves").notNull(),
    bonus: integer("bonus").notNull(),
    defensiveContribution: integer("defensive_contribution").notNull(),
    tackles: integer("tackles").notNull().default(0),
    clearancesBlocksInterceptions: integer("clearances_blocks_interceptions").notNull().default(0),
    recoveries: integer("recoveries").notNull().default(0),
    bps: integer("bps").notNull().default(0),
    playerOfTheMatch: integer("player_of_the_match").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.fixtureId] }),
    index("stats_round_idx").on(t.roundId),
  ],
);

// ---------------------------------------------------------------------------
// Fantasy game
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at"),
});

export const leagues = sqliteTable("leagues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  commissionerId: integer("commissioner_id")
    .notNull()
    .references(() => users.id),
  format: text("format").$type<"h2h" | "points">().notNull().default("h2h"),
  maxTeams: integer("max_teams").notNull(),
  /** Copied from the competition's defaults at creation; the commissioner can edit. */
  squadRules: text("squad_rules", { mode: "json" }).$type<SquadRules>().notNull(),
  scoringRules: text("scoring_rules", { mode: "json" }).$type<ScoringRules>().notNull(),
  /** First round that counts for this league. */
  startRoundId: integer("start_round_id")
    .notNull()
    .references(() => rounds.id),
  draftStatus: text("draft_status")
    .$type<"scheduled" | "live" | "paused" | "complete">()
    .notNull()
    .default("scheduled"),
  draftAt: integer("draft_at", { mode: "timestamp" }),
  pickSeconds: integer("pick_seconds").notNull().default(90),
  /** Fantasy team ids in first-round pick order, set when the draft starts. */
  draftOrder: text("draft_order", { mode: "json" }).$type<number[]>(),
  createdAt: timestamp("created_at"),
});

export const fantasyTeams = sqliteTable(
  "fantasy_teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    createdAt: timestamp("created_at"),
  },
  (t) => [uniqueIndex("team_league_user_uq").on(t.leagueId, t.userId)],
);

export const draftPicks = sqliteTable(
  "draft_picks",
  {
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    /** 0-based overall pick number. */
    overall: integer("overall").notNull(),
    teamId: integer("team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    auto: integer("auto", { mode: "boolean" }).notNull().default(false),
    madeAt: timestamp("made_at"),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.overall] }),
    uniqueIndex("draft_league_player_uq").on(t.leagueId, t.playerId),
  ],
);

export const draftQueue = sqliteTable(
  "draft_queue",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    rank: integer("rank").notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.playerId] })],
);

/** Who owns whom. A player belongs to at most one team per league. */
export const rosterSlots = sqliteTable(
  "roster_slots",
  {
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    acquiredAt: timestamp("acquired_at"),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.playerId] }),
    index("roster_team_idx").on(t.teamId),
  ],
);

/** A team's lineup for one round, i.e. for that round's matchup. */
export const lineups = sqliteTable(
  "lineups",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    roundId: integer("round_id")
      .notNull()
      .references(() => rounds.id),
    /** One of the league's formation names, e.g. "4-3-3". */
    formation: text("formation").notNull(),
    captainId: integer("captain_id").references(() => players.id),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.roundId] })],
);

/** Players in a lineup: starters have a position, bench players a bench order. */
export const lineupPlayers = sqliteTable(
  "lineup_players",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    roundId: integer("round_id")
      .notNull()
      .references(() => rounds.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    /** Position played this round (any position the player is listed at); null on the bench. */
    position: text("position").$type<Position>(),
    /** 1 = first substitute; null for starters. */
    benchOrder: integer("bench_order"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.roundId, t.playerId] })],
);

export const matchups = sqliteTable(
  "matchups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    roundId: integer("round_id")
      .notNull()
      .references(() => rounds.id),
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    /** null = bye. */
    awayTeamId: integer("away_team_id").references(() => fantasyTeams.id),
    homePoints: integer("home_points"),
    awayPoints: integer("away_points"),
    final: integer("final", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("matchups_league_round_idx").on(t.leagueId, t.roundId)],
);
