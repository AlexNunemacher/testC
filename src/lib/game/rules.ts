import type { ScoringRules, SquadRules } from "./types";

/**
 * Default scoring. Based on official FPL, rebalanced for a draft so that elite
 * strikers are the first picks, elite midfielders sit just behind them, and
 * defenders from the best defences go around the end of round one: forwards
 * score 6 per goal, clean sheets are worth 5, defenders get a point for
 * finishing a match, and tackles and player of the match earn points.
 */
export const DEFAULT_SCORING: ScoringRules = {
  appearance: 1,
  longAppearance: 2,
  longAppearanceMinutes: 60,
  fullMatch: { GK: 0, DEF: 1, MID: 0, FWD: 0 },
  fullMatchMinutes: 90,
  goal: { GK: 6, DEF: 6, MID: 5, FWD: 6 },
  assist: 3,
  cleanSheet: { GK: 5, DEF: 5, MID: 1, FWD: 0 },
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
  tackles: { GK: 0, DEF: 1, MID: 1, FWD: 1 },
  tacklesPer: 2,
  bonus: 1,
  playerOfTheMatch: 3,
  // FPL's defensive contribution bonus is off: tackle points cover defending, and
  // it mostly rewards busy defenders on weak teams, which flattens the draft.
  defensiveContribution: 0,
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
