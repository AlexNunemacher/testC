import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING as R } from "./rules";
import { scoreMatchweek, scoreStatLine } from "./scoring";
import { EMPTY_STAT_LINE, type StatLine } from "./types";

const line = (s: Partial<StatLine>): StatLine => ({ ...EMPTY_STAT_LINE, ...s });

describe("scoreStatLine", () => {
  it("gives nothing to a player who didn't play", () => {
    expect(scoreStatLine("FWD", line({ minutes: 0, goalsScored: 1 }), R).points).toBe(0);
  });

  it("scores appearance points by minutes", () => {
    expect(scoreStatLine("MID", line({ minutes: 59 }), R).points).toBe(1);
    expect(scoreStatLine("MID", line({ minutes: 60 }), R).points).toBe(2);
  });

  it("scores goals by position", () => {
    const goal = line({ minutes: 90, goalsScored: 1 });
    expect(scoreStatLine("GK", goal, R).points).toBe(2 + 6);
    expect(scoreStatLine("DEF", goal, R).points).toBe(2 + 6);
    expect(scoreStatLine("MID", goal, R).points).toBe(2 + 5);
    expect(scoreStatLine("FWD", goal, R).points).toBe(2 + 4);
  });

  it("needs 60 minutes for a clean sheet", () => {
    expect(scoreStatLine("DEF", line({ minutes: 90, cleanSheets: 1 }), R).points).toBe(6);
    expect(scoreStatLine("DEF", line({ minutes: 45, cleanSheets: 1 }), R).points).toBe(1);
    expect(scoreStatLine("MID", line({ minutes: 90, cleanSheets: 1 }), R).points).toBe(3);
    expect(scoreStatLine("FWD", line({ minutes: 90, cleanSheets: 1 }), R).points).toBe(2);
  });

  it("deducts per 2 goals conceded for GK/DEF only", () => {
    expect(scoreStatLine("DEF", line({ minutes: 90, goalsConceded: 3 }), R).points).toBe(1);
    expect(scoreStatLine("GK", line({ minutes: 90, goalsConceded: 4 }), R).points).toBe(0);
    expect(scoreStatLine("MID", line({ minutes: 90, goalsConceded: 4 }), R).points).toBe(2);
  });

  it("gives keepers a point per 3 saves", () => {
    expect(scoreStatLine("GK", line({ minutes: 90, saves: 7 }), R).points).toBe(4);
    expect(scoreStatLine("DEF", line({ minutes: 90, saves: 7 }), R).points).toBe(2);
  });

  it("applies cards, own goals, penalties and bonus", () => {
    const s = line({
      minutes: 90,
      yellowCards: 1,
      redCards: 1,
      ownGoals: 1,
      penaltiesMissed: 1,
      bonus: 3,
    });
    expect(scoreStatLine("MID", s, R).points).toBe(2 - 1 - 3 - 2 - 2 + 3);
    expect(scoreStatLine("GK", line({ minutes: 90, penaltiesSaved: 1 }), R).points).toBe(7);
  });

  it("awards defensive contribution at the position's threshold", () => {
    expect(scoreStatLine("DEF", line({ minutes: 90, defensiveContribution: 10 }), R).points).toBe(4);
    expect(scoreStatLine("DEF", line({ minutes: 90, defensiveContribution: 9 }), R).points).toBe(2);
    expect(scoreStatLine("MID", line({ minutes: 90, defensiveContribution: 11 }), R).points).toBe(2);
    expect(scoreStatLine("MID", line({ minutes: 90, defensiveContribution: 12 }), R).points).toBe(4);
    expect(scoreStatLine("GK", line({ minutes: 90, defensiveContribution: 30 }), R).points).toBe(2);
  });

  it("explains every point", () => {
    const r = scoreStatLine("FWD", line({ minutes: 90, goalsScored: 2, assists: 1 }), R);
    expect(r.breakdown).toEqual([
      { stat: "appearance", value: 90, points: 2 },
      { stat: "goalsScored", value: 2, points: 8 },
      { stat: "assists", value: 1, points: 3 },
    ]);
    expect(r.points).toBe(13);
  });

  it("honours custom rules", () => {
    const rules = { ...R, bonus: 0, goal: { ...R.goal, FWD: 10 } };
    expect(scoreStatLine("FWD", line({ minutes: 90, goalsScored: 1, bonus: 3 }), rules).points).toBe(12);
  });
});

describe("scoreMatchweek", () => {
  it("adds up both games in a double matchweek", () => {
    const lines = [line({ minutes: 90, goalsScored: 1 }), line({ minutes: 30 })];
    expect(scoreMatchweek("FWD", lines, R)).toBe(6 + 1);
  });
});
