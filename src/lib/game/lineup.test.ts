import { describe, expect, it } from "vitest";
import { applyAutoSubs, lineupPoints, validateLineup, type Lineup, type LineupPlayer } from "./lineup";
import { DEFAULT_SQUAD } from "./rules";
import type { Position } from "./types";

let nextId = 1;
const p = (position: Position): LineupPlayer => ({ playerId: nextId++, position });

/** 4-4-2 with bench GK, DEF, MID, FWD. */
function makeLineup(): Lineup {
  nextId = 1;
  const starters = [p("GK"), p("DEF"), p("DEF"), p("DEF"), p("DEF"), p("MID"), p("MID"), p("MID"), p("MID"), p("FWD"), p("FWD")];
  const bench = [p("GK"), p("DEF"), p("MID"), p("FWD")];
  return { starters, bench, captainId: 10 };
}

const ids = (l: Lineup) => new Set([...l.starters, ...l.bench].map((x) => x.playerId));

describe("validateLineup", () => {
  it("accepts a valid 4-4-2", () => {
    const l = makeLineup();
    expect(validateLineup(l, ids(l), DEFAULT_SQUAD)).toEqual([]);
  });

  it("rejects two starting keepers", () => {
    const l = makeLineup();
    [l.starters[1], l.bench[0]] = [l.bench[0], l.starters[1]];
    expect(validateLineup(l, ids(l), DEFAULT_SQUAD)).toContain("At most 1 GK can start");
  });

  it("rejects players not on the roster and a benched captain", () => {
    const l = makeLineup();
    const roster = ids(l);
    roster.delete(15);
    roster.add(99);
    l.captainId = 12;
    const errors = validateLineup(l, roster, DEFAULT_SQUAD);
    expect(errors).toContain("Player 15 is not on this roster");
    expect(errors).toContain("Captain must be a starter");
  });
});

describe("applyAutoSubs", () => {
  it("brings on the first bench player who keeps the formation valid", () => {
    const l = makeLineup();
    // Defender 2 didn't play; 3-4-2 + bench DEF (13) keeps it legal.
    const subbed = applyAutoSubs(l, (id) => id !== 2, DEFAULT_SQUAD);
    expect(subbed.starters.map((x) => x.playerId)).toContain(13);
    expect(subbed.bench.map((x) => x.playerId)).toContain(2);
  });

  it("skips bench players who would break the formation", () => {
    const l = makeLineup();
    // Defenders 2 and 3 and bench DEF 13 didn't play. MID 14 replaces DEF 2 (3-5-2 is
    // legal), but FWD 15 can't replace DEF 3 because 2 defenders is below the minimum.
    const played = (id: number) => ![2, 3, 13].includes(id);
    const subbed = applyAutoSubs(l, played, DEFAULT_SQUAD);
    const starterIds = subbed.starters.map((x) => x.playerId);
    expect(starterIds).toContain(3);
    expect(starterIds).not.toContain(2);
    expect(subbed.starters.filter((x) => x.position === "DEF")).toHaveLength(3);
  });

  it("only replaces a keeper with a keeper", () => {
    const l = makeLineup();
    const subbed = applyAutoSubs(l, (id) => id !== 1, DEFAULT_SQUAD);
    expect(subbed.starters[0].playerId).toBe(12);
  });

  it("leaves everyone alone when the bench didn't play", () => {
    const l = makeLineup();
    const subbed = applyAutoSubs(l, (id) => id <= 10, DEFAULT_SQUAD);
    expect(subbed.starters).toEqual(l.starters);
  });
});

describe("lineupPoints", () => {
  it("counts starters and doubles the captain", () => {
    const l = makeLineup();
    const points = (id: number) => (id === 10 ? 8 : id > 11 ? 50 : 1);
    expect(lineupPoints(l, points, DEFAULT_SQUAD)).toBe(10 * 1 + 8 * 2);
  });

  it("doesn't double the captain when captains are off", () => {
    const l = makeLineup();
    const points = (id: number) => (id === 10 ? 8 : 1);
    expect(lineupPoints(l, points, { ...DEFAULT_SQUAD, captain: false })).toBe(18);
  });
});
