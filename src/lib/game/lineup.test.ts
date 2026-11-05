import { describe, expect, it } from "vitest";
import { applyAutoSubs, lineupPoints, validateLineup, type Eligibility, type Lineup } from "./lineup";
import { DEFAULT_SQUAD, squadRuleErrors } from "./rules";
import type { Position } from "./types";

/**
 * Roster: 1-2 GK, 3-7 DEF, 8-12 MID, 13-15 FWD.
 * Player 12 (MID) is also listed at FWD; player 7 (DEF) is also listed at MID.
 */
function roster(): Eligibility {
  const e: Eligibility = new Map();
  const add = (ids: number[], pos: Position) => ids.forEach((id) => e.set(id, [pos]));
  add([1, 2], "GK");
  add([3, 4, 5, 6, 7], "DEF");
  add([8, 9, 10, 11, 12], "MID");
  add([13, 14, 15], "FWD");
  e.set(12, ["MID", "FWD"]);
  e.set(7, ["DEF", "MID"]);
  return e;
}

const s = (playerId: number, position: Position) => ({ playerId, position });

function fourFourTwo(): Lineup {
  return {
    formation: "4-4-2",
    starters: [
      s(1, "GK"),
      s(3, "DEF"), s(4, "DEF"), s(5, "DEF"), s(6, "DEF"),
      s(8, "MID"), s(9, "MID"), s(10, "MID"), s(11, "MID"),
      s(13, "FWD"), s(14, "FWD"),
    ],
    bench: [2, 7, 12, 15],
    captainId: 13,
  };
}

function fourThreeThree(): Lineup {
  return {
    formation: "4-3-3",
    starters: [
      s(1, "GK"),
      s(3, "DEF"), s(4, "DEF"), s(5, "DEF"), s(6, "DEF"),
      s(8, "MID"), s(9, "MID"), s(10, "MID"),
      s(13, "FWD"), s(14, "FWD"), s(15, "FWD"),
    ],
    bench: [2, 7, 11, 12],
    captainId: 13,
  };
}

describe("default squad rules", () => {
  it("are valid and allow 4-4-2 and 4-3-3 only", () => {
    expect(squadRuleErrors(DEFAULT_SQUAD)).toEqual([]);
    expect(DEFAULT_SQUAD.formations.map((f) => f.name)).toEqual(["4-4-2", "4-3-3"]);
  });

  it("reject formations without exactly one keeper", () => {
    const bad = { ...DEFAULT_SQUAD, formations: [{ name: "0-5-5", slots: { GK: 0, DEF: 5, MID: 5, FWD: 1 } }] };
    expect(squadRuleErrors(bad)).toContain("0-5-5 must start exactly one goalkeeper");
  });
});

describe("validateLineup", () => {
  it("accepts a valid 4-4-2 and a valid 4-3-3", () => {
    expect(validateLineup(fourFourTwo(), roster(), DEFAULT_SQUAD)).toEqual([]);
    expect(validateLineup(fourThreeThree(), roster(), DEFAULT_SQUAD)).toEqual([]);
  });

  it("rejects formations the league doesn't allow", () => {
    const l = { ...fourFourTwo(), formation: "3-5-2" };
    expect(validateLineup(l, roster(), DEFAULT_SQUAD)).toContain("Formation 3-5-2 isn't allowed in this league");
  });

  it("rejects a lineup that doesn't match its formation", () => {
    const l = { ...fourFourTwo(), formation: "4-3-3" };
    expect(validateLineup(l, roster(), DEFAULT_SQUAD)).toEqual(["4-3-3 needs 3 MID, got 4", "4-3-3 needs 3 FWD, got 2"]);
  });

  it("requires a keeper in goal", () => {
    const l = fourFourTwo();
    l.starters[0] = s(1, "DEF");
    l.starters[1] = s(3, "GK");
    const errors = validateLineup(l, roster(), DEFAULT_SQUAD);
    expect(errors).toContain("Player 1 isn't listed at DEF");
    expect(errors).toContain("Player 3 isn't listed at GK");
  });

  it("lets a player switch to another position they're listed at", () => {
    const l = fourThreeThree();
    // Midfielder 12 (also a FWD) leads the line instead of forward 15.
    l.starters[10] = s(12, "FWD");
    l.bench = [2, 7, 11, 15];
    expect(validateLineup(l, roster(), DEFAULT_SQUAD)).toEqual([]);
  });

  it("doesn't let a player play a position they aren't listed at", () => {
    const l = fourThreeThree();
    l.starters[10] = s(11, "FWD");
    l.bench = [2, 7, 12, 15];
    expect(validateLineup(l, roster(), DEFAULT_SQUAD)).toContain("Player 11 isn't listed at FWD");
  });

  it("rejects players not on the roster and a benched captain", () => {
    const l = fourFourTwo();
    l.bench = [2, 7, 12, 99];
    l.captainId = 12;
    const errors = validateLineup(l, roster(), DEFAULT_SQUAD);
    expect(errors).toContain("Player 99 is not on this roster");
    expect(errors).toContain("Every rostered player must be a starter or on the bench");
    expect(errors).toContain("Captain must be a starter");
  });
});

describe("applyAutoSubs", () => {
  it("keeps the formation, bringing on the first bench player listed at that position", () => {
    // Midfielder 9 didn't play. Bench: GK 2 (wrong position), DEF/MID 7 (eligible).
    const subbed = applyAutoSubs(fourFourTwo(), roster(), (id) => id !== 9);
    expect(subbed.starters[6]).toEqual(s(7, "MID"));
    expect(subbed.bench).toEqual([2, 9, 12, 15]);
    expect(subbed.formation).toBe("4-4-2");
  });

  it("skips bench players who didn't play", () => {
    const subbed = applyAutoSubs(fourFourTwo(), roster(), (id) => id !== 13 && id !== 12);
    expect(subbed.starters[9]).toEqual(s(15, "FWD"));
  });

  it("only replaces a keeper with a keeper", () => {
    const subbed = applyAutoSubs(fourFourTwo(), roster(), (id) => id !== 1);
    expect(subbed.starters[0]).toEqual(s(2, "GK"));
    const noKeeper = applyAutoSubs(fourFourTwo(), roster(), (id) => id !== 1 && id !== 2);
    expect(noKeeper.starters[0]).toEqual(s(1, "GK"));
  });

  it("leaves a starter in when nobody eligible played", () => {
    const subbed = applyAutoSubs(fourFourTwo(), roster(), (id) => id !== 3 && id !== 7);
    expect(subbed.starters[1]).toEqual(s(3, "DEF"));
  });
});

describe("lineupPoints", () => {
  it("counts starters at their lineup position and doubles the captain", () => {
    const points = (id: number, pos: Position) => (id === 13 ? 8 : pos === "FWD" ? 5 : 1);
    // 9 non-FWD starters at 1, FWD 14 at 5, captain 13 at 8 x2.
    expect(lineupPoints(fourFourTwo(), points, DEFAULT_SQUAD)).toBe(9 + 5 + 16);
  });

  it("scores a switched player at the position they filled", () => {
    const l = fourThreeThree();
    l.starters[10] = s(12, "FWD");
    const seen: [number, Position][] = [];
    lineupPoints(l, (id, pos) => (seen.push([id, pos]), 0), DEFAULT_SQUAD);
    expect(seen).toContainEqual([12, "FWD"]);
  });

  it("doesn't double the captain when captains are off", () => {
    const points = (id: number) => (id === 13 ? 8 : 1);
    expect(lineupPoints(fourFourTwo(), points, { ...DEFAULT_SQUAD, captain: false })).toBe(10 + 8);
  });
});
