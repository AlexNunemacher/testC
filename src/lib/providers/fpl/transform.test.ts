import { describe, expect, it } from "vitest";
import { fplSchemas } from "./client";
import { markPlayerOfTheMatch, splitLiveStats } from "./transform";

// Hand-written sample in the shape of /api/event/{id}/live/ (not real match data).
const sample = fplSchemas.liveSchema.parse({
  elements: [
    {
      id: 1,
      stats: { minutes: 90, starts: 1, goals_scored: 1, clean_sheets: 1, bonus: 2, tackles: 3, bps: 30 },
      explain: [{ fixture: 100, stats: [{ identifier: "minutes", points: 2, value: 90 }] }],
    },
    {
      id: 2,
      // Double matchweek: explain omits saves and goals conceded for fixture 201.
      stats: { minutes: 180, goals_scored: 0, goals_conceded: 3, saves: 5, clean_sheets: 0 },
      explain: [
        {
          fixture: 200,
          stats: [
            { identifier: "minutes", points: 2, value: 90 },
            { identifier: "saves", points: 1, value: 3 },
          ],
        },
        { fixture: 201, stats: [{ identifier: "minutes", points: 2, value: 90 }] },
      ],
    },
    { id: 3, stats: {}, explain: [] },
  ],
});

describe("splitLiveStats", () => {
  const lines = splitLiveStats(sample);

  it("uses the matchweek totals for a single fixture", () => {
    const l = lines.find((x) => x.playerId === 1)!;
    expect(l).toMatchObject({ fixtureId: 100, minutes: 90, starts: 1, goalsScored: 1, cleanSheets: 1, bonus: 2, tackles: 3 });
  });

  it("splits a double matchweek and keeps totals intact", () => {
    const l = lines.filter((x) => x.playerId === 2);
    expect(l.map((x) => x.fixtureId)).toEqual([200, 201]);
    expect(l[0]).toMatchObject({ minutes: 90, saves: 3 });
    expect(l[1]).toMatchObject({ minutes: 90, saves: 2, goalsConceded: 3 });
  });

  it("skips players with no fixture", () => {
    expect(lines.some((x) => x.playerId === 3)).toBe(false);
  });

  it("defaults missing stats (e.g. older seasons) to zero", () => {
    expect(lines.find((x) => x.playerId === 1)!.defensiveContribution).toBe(0);
  });
});

describe("markPlayerOfTheMatch", () => {
  const fixture = (id: number, h: [number, number][], a: [number, number][]) =>
    fplSchemas.fixturesSchema.parse([
      {
        id,
        event: 1,
        team_h: 1,
        team_a: 2,
        kickoff_time: null,
        started: true,
        finished: true,
        team_h_score: 1,
        team_a_score: 0,
        stats: [
          {
            identifier: "bps",
            h: h.map(([element, value]) => ({ element, value })),
            a: a.map(([element, value]) => ({ element, value })),
          },
        ],
      },
    ])[0];

  it("uses the fixture's BPS table, so each game in a double matchweek is rated separately", () => {
    const lines = splitLiveStats(sample);
    markPlayerOfTheMatch(lines, [fixture(200, [[2, 35]], [[9, 20]]), fixture(201, [[2, 8]], [])]);
    const [first, second] = lines.filter((x) => x.playerId === 2);
    expect(first).toMatchObject({ bps: 35, playerOfTheMatch: 1 });
    expect(second).toMatchObject({ bps: 8, playerOfTheMatch: 1 });
  });

  it("picks the top BPS among players who played, including ties", () => {
    const lines = [
      { ...splitLiveStats(sample)[0], playerId: 1, fixtureId: 300, minutes: 90 },
      { ...splitLiveStats(sample)[0], playerId: 4, fixtureId: 300, minutes: 90 },
      { ...splitLiveStats(sample)[0], playerId: 5, fixtureId: 300, minutes: 90 },
      { ...splitLiveStats(sample)[0], playerId: 6, fixtureId: 300, minutes: 0 },
    ];
    markPlayerOfTheMatch(lines, [fixture(300, [[1, 30], [4, 30]], [[5, 12], [6, 99]])]);
    expect(lines.map((l) => l.playerOfTheMatch)).toEqual([1, 1, 0, 0]);
  });

  it("falls back to live BPS when the fixture has no BPS table", () => {
    const lines = splitLiveStats(sample);
    markPlayerOfTheMatch(lines, []);
    expect(lines.find((x) => x.playerId === 1)).toMatchObject({ bps: 30, playerOfTheMatch: 1 });
  });
});
