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
    const goal = line({ minutes: 89, goalsScored: 1 });
    expect(scoreStatLine("GK", goal, R).points).toBe(2 + 6);
    expect(scoreStatLine("DEF", goal, R).points).toBe(2 + 6);
    expect(scoreStatLine("MID", goal, R).points).toBe(2 + 5);
    expect(scoreStatLine("FWD", goal, R).points).toBe(2 + 6);
  });

  it("needs 60 minutes for a clean sheet", () => {
    expect(scoreStatLine("DEF", line({ minutes: 89, cleanSheets: 1 }), R).points).toBe(2 + 5);
    expect(scoreStatLine("DEF", line({ minutes: 45, cleanSheets: 1 }), R).points).toBe(1);
    expect(scoreStatLine("MID", line({ minutes: 89, cleanSheets: 1 }), R).points).toBe(2 + 1);
    expect(scoreStatLine("FWD", line({ minutes: 89, cleanSheets: 1 }), R).points).toBe(2);
  });

  it("gives defenders a point for starting and finishing the match", () => {
    expect(scoreStatLine("DEF", line({ minutes: 90, starts: 1 }), R).points).toBe(2 + 1);
    // Came off early, or came on as a sub: no bonus.
    expect(scoreStatLine("DEF", line({ minutes: 85, starts: 1 }), R).points).toBe(2);
    expect(scoreStatLine("DEF", line({ minutes: 90, starts: 0 }), R).points).toBe(2);
    // Other positions don't get it by default.
    expect(scoreStatLine("MID", line({ minutes: 90, starts: 1 }), R).points).toBe(2);
    expect(scoreStatLine("GK", line({ minutes: 90, starts: 1 }), R).points).toBe(2);
  });

  it("deducts per 2 goals conceded for GK/DEF only", () => {
    expect(scoreStatLine("DEF", line({ minutes: 89, goalsConceded: 3 }), R).points).toBe(1);
    expect(scoreStatLine("GK", line({ minutes: 89, goalsConceded: 4 }), R).points).toBe(0);
    expect(scoreStatLine("MID", line({ minutes: 89, goalsConceded: 4 }), R).points).toBe(2);
  });

  it("gives keepers a point per 3 saves", () => {
    expect(scoreStatLine("GK", line({ minutes: 89, saves: 7 }), R).points).toBe(4);
    expect(scoreStatLine("DEF", line({ minutes: 89, saves: 7 }), R).points).toBe(2);
  });

  it("gives outfield players a point per 2 tackles", () => {
    expect(scoreStatLine("DEF", line({ minutes: 89, tackles: 1 }), R).points).toBe(2);
    expect(scoreStatLine("DEF", line({ minutes: 89, tackles: 2 }), R).points).toBe(3);
    expect(scoreStatLine("MID", line({ minutes: 89, tackles: 5 }), R).points).toBe(4);
    expect(scoreStatLine("FWD", line({ minutes: 89, tackles: 4 }), R).points).toBe(4);
    expect(scoreStatLine("GK", line({ minutes: 89, tackles: 4 }), R).points).toBe(2);
  });

  it("awards player of the match", () => {
    expect(scoreStatLine("MID", line({ minutes: 89, playerOfTheMatch: 1 }), R).points).toBe(2 + 3);
  });

  it("applies cards, own goals, penalties and bonus", () => {
    const s = line({
      minutes: 89,
      yellowCards: 1,
      redCards: 1,
      ownGoals: 1,
      penaltiesMissed: 1,
      bonus: 3,
    });
    expect(scoreStatLine("MID", s, R).points).toBe(2 - 1 - 3 - 2 - 2 + 3);
    expect(scoreStatLine("GK", line({ minutes: 89, penaltiesSaved: 1 }), R).points).toBe(7);
  });

  it("ignores defensive contribution by default but supports it as a league option", () => {
    const busy = line({ minutes: 89, defensiveContribution: 10 });
    expect(scoreStatLine("DEF", busy, R).points).toBe(2);
    const rules = { ...R, defensiveContribution: 2 };
    expect(scoreStatLine("DEF", busy, rules).points).toBe(4);
    expect(scoreStatLine("DEF", line({ minutes: 89, defensiveContribution: 9 }), rules).points).toBe(2);
    expect(scoreStatLine("MID", line({ minutes: 89, defensiveContribution: 12 }), rules).points).toBe(4);
    expect(scoreStatLine("GK", line({ minutes: 89, defensiveContribution: 30 }), rules).points).toBe(2);
  });

  it("explains every point", () => {
    const r = scoreStatLine(
      "DEF",
      line({ minutes: 90, starts: 1, goalsScored: 1, cleanSheets: 1, tackles: 3, bonus: 3, playerOfTheMatch: 1 }),
      R,
    );
    expect(r.breakdown).toEqual([
      { stat: "appearance", value: 90, points: 2 },
      { stat: "fullMatch", value: 90, points: 1 },
      { stat: "goalsScored", value: 1, points: 6 },
      { stat: "cleanSheets", value: 1, points: 5 },
      { stat: "tackles", value: 3, points: 1 },
      { stat: "bonus", value: 3, points: 3 },
      { stat: "playerOfTheMatch", value: 1, points: 3 },
    ]);
    expect(r.points).toBe(21);
  });

  it("honours custom rules", () => {
    const rules = { ...R, bonus: 0, playerOfTheMatch: 0, goal: { ...R.goal, FWD: 10 } };
    const s = line({ minutes: 89, goalsScored: 1, bonus: 3, playerOfTheMatch: 1 });
    expect(scoreStatLine("FWD", s, rules).points).toBe(12);
  });
});

describe("scoreMatchweek", () => {
  it("adds up both games in a double matchweek", () => {
    const lines = [line({ minutes: 89, goalsScored: 1 }), line({ minutes: 30 })];
    expect(scoreMatchweek("FWD", lines, R)).toBe(8 + 1);
  });
});
