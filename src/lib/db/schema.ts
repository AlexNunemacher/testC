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
// Real-world Premier League data, synced from the Fantasy Premier League API.
// Ids are the FPL ids so syncs can upsert.
// ---------------------------------------------------------------------------

export const clubs = sqliteTable("clubs", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
});

export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    webName: text("web_name").notNull(),
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id),
    position: text("position").$type<Position>().notNull(),
    /** FPL availability: a=available, d=doubtful, i=injured, s=suspended, u=unavailable, n=not in squad. */
    status: text("status").notNull(),
    news: text("news").notNull().default(""),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("players_club_idx").on(t.clubId), index("players_position_idx").on(t.position)],
);

export const matchweeks = sqliteTable("matchweeks", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  deadline: integer("deadline", { mode: "timestamp" }).notNull(),
  finished: integer("finished", { mode: "boolean" }).notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull(),
  isNext: integer("is_next", { mode: "boolean" }).notNull(),
  /** FPL has confirmed the stats; no more corrections expected. */
  dataChecked: integer("data_checked", { mode: "boolean" }).notNull(),
  /** We synced stats after dataChecked became true, so they never need re-syncing. */
  statsFinal: integer("stats_final", { mode: "boolean" }).notNull().default(false),
});

export const fixtures = sqliteTable(
  "fixtures",
  {
    id: integer("id").primaryKey(),
    /** null while a postponed fixture has no new date. */
    matchweekId: integer("matchweek_id").references(() => matchweeks.id),
    homeClubId: integer("home_club_id")
      .notNull()
      .references(() => clubs.id),
    awayClubId: integer("away_club_id")
      .notNull()
      .references(() => clubs.id),
    kickoff: integer("kickoff", { mode: "timestamp" }),
    started: integer("started", { mode: "boolean" }).notNull(),
    finished: integer("finished", { mode: "boolean" }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
  },
  (t) => [index("fixtures_matchweek_idx").on(t.matchweekId)],
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
    matchweekId: integer("matchweek_id")
      .notNull()
      .references(() => matchweeks.id),
    minutes: integer("minutes").notNull(),
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
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.fixtureId] }),
    index("stats_matchweek_idx").on(t.matchweekId),
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
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  commissionerId: integer("commissioner_id")
    .notNull()
    .references(() => users.id),
  format: text("format").$type<"h2h" | "points">().notNull().default("h2h"),
  maxTeams: integer("max_teams").notNull(),
  squadRules: text("squad_rules", { mode: "json" }).$type<SquadRules>().notNull(),
  scoringRules: text("scoring_rules", { mode: "json" }).$type<ScoringRules>().notNull(),
  /** First matchweek that counts for this league. */
  startMatchweek: integer("start_matchweek").notNull(),
  draftStatus: text("draft_status")
    .$type<"scheduled" | "live" | "paused" | "complete">()
    .notNull()
    .default("scheduled"),
  draftAt: integer("draft_at", { mode: "timestamp" }),
  pickSeconds: integer("pick_seconds").notNull().default(90),
  /** Team ids in first-round pick order, set when the draft starts. */
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

/** A team's lineup for one matchweek. slot 1-11 = starters, 12+ = bench in priority order. */
export const lineupSlots = sqliteTable(
  "lineup_slots",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    matchweekId: integer("matchweek_id")
      .notNull()
      .references(() => matchweeks.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    slot: integer("slot").notNull(),
    isCaptain: integer("is_captain", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.matchweekId, t.playerId] })],
);

export const matchups = sqliteTable(
  "matchups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    matchweekId: integer("matchweek_id")
      .notNull()
      .references(() => matchweeks.id),
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => fantasyTeams.id),
    /** null = bye week. */
    awayTeamId: integer("away_team_id").references(() => fantasyTeams.id),
    homePoints: integer("home_points"),
    awayPoints: integer("away_points"),
    final: integer("final", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("matchups_league_mw_idx").on(t.leagueId, t.matchweekId)],
);
