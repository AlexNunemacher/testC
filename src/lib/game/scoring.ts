import type {
  Position,
  ScoreBreakdownItem,
  ScoreResult,
  ScoringRules,
  StatLine,
} from "./types";

/** Score one player's stats from one fixture. */
export function scoreStatLine(
  position: Position,
  s: StatLine,
  rules: ScoringRules,
): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];
  const add = (stat: ScoreBreakdownItem["stat"], value: number, points: number) => {
    if (points !== 0) breakdown.push({ stat, value, points });
  };

  if (s.minutes <= 0) return { points: 0, breakdown };

  add(
    "appearance",
    s.minutes,
    s.minutes >= rules.longAppearanceMinutes ? rules.longAppearance : rules.appearance,
  );
  add("goalsScored", s.goalsScored, s.goalsScored * rules.goal[position]);
  add("assists", s.assists, s.assists * rules.assist);
  if (s.cleanSheets > 0 && s.minutes >= rules.cleanSheetMinutes) {
    add("cleanSheets", 1, rules.cleanSheet[position]);
  }
  if (rules.goalsConcededPer > 0) {
    add(
      "goalsConceded",
      s.goalsConceded,
      Math.floor(s.goalsConceded / rules.goalsConcededPer) * rules.goalsConceded[position],
    );
  }
  if (position === "GK" && rules.savesPer > 0) {
    add("saves", s.saves, Math.floor(s.saves / rules.savesPer) * rules.saves);
  }
  add("penaltiesSaved", s.penaltiesSaved, s.penaltiesSaved * rules.penaltySaved);
  add("penaltiesMissed", s.penaltiesMissed, s.penaltiesMissed * rules.penaltyMissed);
  add("yellowCards", s.yellowCards, s.yellowCards * rules.yellowCard);
  add("redCards", s.redCards, s.redCards * rules.redCard);
  add("ownGoals", s.ownGoals, s.ownGoals * rules.ownGoal);
  add("bonus", s.bonus, s.bonus * rules.bonus);
  const threshold = rules.defensiveContributionThreshold[position];
  if (threshold > 0 && s.defensiveContribution >= threshold) {
    add("defensiveContribution", s.defensiveContribution, rules.defensiveContribution);
  }

  return { points: breakdown.reduce((sum, b) => sum + b.points, 0), breakdown };
}

/** Score a player across every fixture they had in a matchweek (handles double matchweeks). */
export function scoreMatchweek(
  position: Position,
  lines: StatLine[],
  rules: ScoringRules,
): number {
  return lines.reduce((sum, line) => sum + scoreStatLine(position, line, rules).points, 0);
}
