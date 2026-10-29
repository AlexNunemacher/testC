import type { ScoringRules, SquadRules } from "./types";

/** Default scoring, modelled on the official Fantasy Premier League rules. */
export const DEFAULT_SCORING: ScoringRules = {
  appearance: 1,
  longAppearance: 2,
  longAppearanceMinutes: 60,
  goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
  assist: 3,
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
  cleanSheetMinutes: 60,
  goalsConceded: { GK: -1, DEF: -1, MID: 0, FWD: 0 },
  goalsConcededPer: 2,
  saves: 1,
  savesPer: 3,
  penaltySaved: 5,
  penaltyMissed: -2,
  yellowCard: -1,
  redCard: -3,
  ownGoal: -2,
  bonus: 1,
  defensiveContribution: 2,
  defensiveContributionThreshold: { GK: 0, DEF: 10, MID: 12, FWD: 12 },
};

/** Default squad: 15 players, 11 starters, formations like 3-4-3 / 4-4-2 / 5-3-2. */
export const DEFAULT_SQUAD: SquadRules = {
  rosterSize: { GK: 2, DEF: 5, MID: 5, FWD: 3 },
  minStarters: { GK: 1, DEF: 3, MID: 2, FWD: 1 },
  maxStarters: { GK: 1, DEF: 5, MID: 5, FWD: 3 },
  maxPerClub: null,
  captain: true,
};

export const STARTERS = 11;

export function rosterTotal(squad: SquadRules): number {
  return Object.values(squad.rosterSize).reduce((a, b) => a + b, 0);
}
