import { describe, expect, it } from "vitest";
import { fplSchemas } from "./client";
import { splitLiveStats } from "./transform";

// Hand-written sample in the shape of /api/event/{id}/live/ (not real match data).
const sample = fplSchemas.liveSchema.parse({
  elements: [
    {
      id: 1,
      stats: { minutes: 90, goals_scored: 1, assists: 0, clean_sheets: 1, bonus: 2, saves: 0 },
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
    expect(l).toMatchObject({ fixtureId: 100, minutes: 90, goalsScored: 1, cleanSheets: 1, bonus: 2 });
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
