import { EMPTY_STAT_LINE, type Position, type StatLine } from "@/lib/game/types";
import type { FplBootstrap, FplFixture, FplLive } from "./client";

const POSITION_BY_CODE: Record<string, Position> = {
  GKP: "GK",
  DEF: "DEF",
  MID: "MID",
  FWD: "FWD",
};

/** Map FPL element_type ids to our positions (e.g. 1 → GK). */
export function positionMap(bootstrap: FplBootstrap): Map<number, Position> {
  const map = new Map<number, Position>();
  for (const t of bootstrap.element_types) {
    const pos = POSITION_BY_CODE[t.singular_name_short];
    // FPL has other element types (e.g. managers in some seasons); they aren't draftable.
    if (pos) map.set(t.id, pos);
  }
  return map;
}

/** Stats copied from FPL; playerOfTheMatch is derived, not provided. */
type FplStatKey = Exclude<keyof StatLine, "playerOfTheMatch">;

const STAT_KEYS: Record<FplStatKey, string> = {
  minutes: "minutes",
  starts: "starts",
  goalsScored: "goals_scored",
  assists: "assists",
  cleanSheets: "clean_sheets",
  goalsConceded: "goals_conceded",
  ownGoals: "own_goals",
  penaltiesSaved: "penalties_saved",
  penaltiesMissed: "penalties_missed",
  yellowCards: "yellow_cards",
  redCards: "red_cards",
  saves: "saves",
  bonus: "bonus",
  defensiveContribution: "defensive_contribution",
  tackles: "tackles",
  clearancesBlocksInterceptions: "clearances_blocks_interceptions",
  recoveries: "recoveries",
  bps: "bps",
};

const FPL_STAT_KEYS = Object.keys(STAT_KEYS) as FplStatKey[];

export interface FixtureStatLine extends StatLine {
  playerId: number;
  fixtureId: number;
}

function emptyLine(): StatLine {
  return { ...EMPTY_STAT_LINE };
}

/**
 * Split FPL's per-matchweek live stats into one stat line per player per fixture.
 *
 * FPL gives each player a matchweek total (`stats`) plus a per-fixture
 * `explain` list. With one fixture the total is exact. In a double matchweek
 * the per-fixture split comes from `explain`, which may leave out stats that
 * scored no FPL points, so any shortfall against the total is added to the
 * player's last fixture with minutes to keep matchweek totals correct.
 */
export function splitLiveStats(live: FplLive): FixtureStatLine[] {
  const out: FixtureStatLine[] = [];

  for (const el of live.elements) {
    const fixtureIds = [...new Set(el.explain.map((e) => e.fixture))];
    if (fixtureIds.length === 0) continue;

    const total = emptyLine();
    for (const key of FPL_STAT_KEYS) {
      total[key] = el.stats[STAT_KEYS[key] as keyof typeof el.stats];
    }

    if (fixtureIds.length === 1) {
      out.push({ playerId: el.id, fixtureId: fixtureIds[0], ...total });
      continue;
    }

    const lines = fixtureIds.map((fixtureId) => {
      const line = emptyLine();
      for (const e of el.explain.filter((x) => x.fixture === fixtureId)) {
        for (const s of e.stats) {
          const key = FPL_STAT_KEYS.find((k) => STAT_KEYS[k] === s.identifier);
          if (key) line[key] += s.value;
        }
      }
      return { playerId: el.id, fixtureId, ...line };
    });

    const target = lines.findLast((l) => l.minutes > 0) ?? lines[lines.length - 1];
    for (const key of FPL_STAT_KEYS) {
      const split = lines.reduce((sum, l) => sum + l[key], 0);
      if (split < total[key]) target[key] += total[key] - split;
    }
    out.push(...lines);
  }

  return out;
}

/**
 * Fill in each line's per-fixture BPS from the fixture's own BPS table (exact
 * even in a double matchweek) and mark the player of the match: the highest BPS
 * among players who played in that fixture. Tied players all get it.
 */
export function markPlayerOfTheMatch(lines: FixtureStatLine[], fixtures: FplFixture[]): void {
  const bpsByFixture = new Map<number, Map<number, number>>();
  for (const f of fixtures) {
    const table = f.stats.find((s) => s.identifier === "bps");
    if (table) bpsByFixture.set(f.id, new Map([...table.h, ...table.a].map((x) => [x.element, x.value])));
  }

  const byFixture = new Map<number, FixtureStatLine[]>();
  for (const line of lines) {
    const bps = bpsByFixture.get(line.fixtureId)?.get(line.playerId);
    if (bps !== undefined) line.bps = bps;
    line.playerOfTheMatch = 0;
    if (line.minutes > 0) byFixture.set(line.fixtureId, [...(byFixture.get(line.fixtureId) ?? []), line]);
  }

  for (const played of byFixture.values()) {
    const best = Math.max(...played.map((l) => l.bps));
    if (best <= 0) continue;
    for (const l of played) if (l.bps === best) l.playerOfTheMatch = 1;
  }
}
