export const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
export type Position = (typeof POSITIONS)[number];

/** One player's stats from one real-world fixture. */
export interface StatLine {
  minutes: number;
  /** 1 if the player was in the starting XI. */
  starts: number;
  goalsScored: number;
  assists: number;
  /** 1 if the player's team kept a clean sheet while they were on the pitch. */
  cleanSheets: number;
  /** Goals conceded while the player was on the pitch. */
  goalsConceded: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  bonus: number;
  /** Clearances, blocks, interceptions, tackles (+ recoveries for MID/FWD). */
  defensiveContribution: number;
  tackles: number;
  clearancesBlocksInterceptions: number;
  recoveries: number;
  /** FPL's Bonus Points System match rating. */
  bps: number;
  /** 1 if the player had the highest BPS rating in the match (ties all count). */
  playerOfTheMatch: number;
}

export const EMPTY_STAT_LINE: StatLine = {
  minutes: 0,
  starts: 0,
  goalsScored: 0,
  assists: 0,
  cleanSheets: 0,
  goalsConceded: 0,
  ownGoals: 0,
  penaltiesSaved: 0,
  penaltiesMissed: 0,
  yellowCards: 0,
  redCards: 0,
  saves: 0,
  bonus: 0,
  defensiveContribution: 0,
  tackles: 0,
  clearancesBlocksInterceptions: 0,
  recoveries: 0,
  bps: 0,
  playerOfTheMatch: 0,
};

type PerPosition = Record<Position, number>;

export interface ScoringRules {
  /** Points for playing at least 1 minute but under `longAppearanceMinutes`. */
  appearance: number;
  /** Points for playing `longAppearanceMinutes` or more (replaces `appearance`). */
  longAppearance: number;
  longAppearanceMinutes: number;
  /** Points for starting and playing `fullMatchMinutes` or more. */
  fullMatch: PerPosition;
  fullMatchMinutes: number;
  goal: PerPosition;
  assist: number;
  cleanSheet: PerPosition;
  /** Minimum minutes for a clean sheet to count. */
  cleanSheetMinutes: number;
  /** Points per `goalsConcededPer` goals conceded (usually negative). */
  goalsConceded: PerPosition;
  goalsConcededPer: number;
  /** Points per `savesPer` saves. */
  saves: number;
  savesPer: number;
  penaltySaved: number;
  penaltyMissed: number;
  yellowCard: number;
  redCard: number;
  ownGoal: number;
  /** Points per tackle bucket: `tackles[pos]` for every `tacklesPer` tackles. */
  tackles: PerPosition;
  tacklesPer: number;
  /** Points per bonus point awarded by the data provider (0 disables bonus). */
  bonus: number;
  /** Points for the highest-rated (BPS) player in the match. */
  playerOfTheMatch: number;
  defensiveContribution: number;
  /** Threshold per position; 0 means the position can't earn it. */
  defensiveContributionThreshold: PerPosition;
}

export interface SquadRules {
  /** Exact number of each position on a full roster. */
  rosterSize: PerPosition;
  /** Minimum starters per position in a valid lineup (11 starters). */
  minStarters: PerPosition;
  /** Maximum starters per position in a valid lineup. */
  maxStarters: PerPosition;
  /** Max players from the same real club on one roster; null for no limit. */
  maxPerClub: number | null;
  /** Whether a captain scores double. */
  captain: boolean;
}

export interface ScoreBreakdownItem {
  stat: keyof StatLine | "appearance" | "fullMatch";
  value: number;
  points: number;
}

export interface ScoreResult {
  points: number;
  breakdown: ScoreBreakdownItem[];
}
