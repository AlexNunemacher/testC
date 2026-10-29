import { describe, expect, it } from "vitest";
import { roundRobin } from "./schedule";

function opponents(schedule: ReturnType<typeof roundRobin>, team: number) {
  return schedule.map((round) => {
    const m = round.find((p) => p.home === team || p.away === team);
    if (!m) throw new Error(`team ${team} missing from a round`);
    return m.home === team ? m.away : m.home;
  });
}

describe("roundRobin", () => {
  it("has every team play every other team once per cycle", () => {
    const teams = [1, 2, 3, 4, 5, 6];
    const schedule = roundRobin(teams, 5);
    for (const t of teams) {
      expect(new Set(opponents(schedule, t))).toEqual(new Set(teams.filter((x) => x !== t)));
    }
  });

  it("fills all 38 matchweeks and keeps every team in every round", () => {
    const schedule = roundRobin([1, 2, 3, 4, 5, 6, 7, 8], 38);
    expect(schedule).toHaveLength(38);
    for (const round of schedule) {
      const seen = round.flatMap((p) => [p.home, p.away]);
      expect(new Set(seen).size).toBe(8);
    }
  });

  it("gives one bye per round with an odd number of teams", () => {
    const schedule = roundRobin([1, 2, 3, 4, 5], 10);
    for (const round of schedule) {
      expect(round.filter((p) => p.away === null)).toHaveLength(1);
    }
    // Over two full cycles everyone gets exactly two byes.
    for (const t of [1, 2, 3, 4, 5]) {
      expect(opponents(schedule, t).filter((o) => o === null)).toHaveLength(2);
    }
  });

  it("swaps home and away on the second cycle", () => {
    const schedule = roundRobin([1, 2, 3, 4], 6);
    expect(schedule[3]).toEqual(schedule[0].map((p) => ({ home: p.away, away: p.home })));
  });
});
