import type { Formation, Position, ScoringRules, SquadRules } from "./types";

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

export const FORMATIONS = {
  "4-4-2": { name: "4-4-2", slots: { GK: 1, DEF: 4, MID: 4, FWD: 2 } },
  "4-3-3": { name: "4-3-3", slots: { GK: 1, DEF: 4, MID: 3, FWD: 3 } },
} as const satisfies Record<string, Formation>;

/** Default squad: 15 players; start 11 in a 4-4-2 or 4-3-3, always with one keeper. */
export const DEFAULT_SQUAD: SquadRules = {
  rosterSize: { GK: 2, DEF: 5, MID: 5, FWD: 3 },
  formations: [FORMATIONS["4-4-2"], FORMATIONS["4-3-3"]],
  maxPerTeam: null,
  captain: true,
};

export const STARTERS = 11;

/** Problems with a league's squad rules (empty if they're usable). */
export function squadRuleErrors(squad: SquadRules): string[] {
  const errors: string[] = [];
  if (squad.formations.length === 0) errors.push("At least one formation is required");
  for (const f of squad.formations) {
    const total = Object.values(f.slots).reduce((a, b) => a + b, 0);
    if (total !== STARTERS) errors.push(`${f.name} has ${total} starters, not ${STARTERS}`);
    if (f.slots.GK !== 1) errors.push(`${f.name} must start exactly one goalkeeper`);
    for (const pos of Object.keys(f.slots) as Position[]) {
      if (f.slots[pos] > squad.rosterSize[pos]) {
        errors.push(`${f.name} needs ${f.slots[pos]} ${pos} but rosters only hold ${squad.rosterSize[pos]}`);
      }
    }
  }
  return errors;
}

export function rosterTotal(squad: SquadRules): number {
  return Object.values(squad.rosterSize).reduce((a, b) => a + b, 0);
}
