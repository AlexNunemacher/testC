import type { Position, StatLine } from "@/lib/game/types";
import type { FplBootstrap, FplLive } from "./client";

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

const STAT_KEYS: Record<keyof StatLine, string> = {
  minutes: "minutes",
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
};

export interface FixtureStatLine extends StatLine {
  playerId: number;
  fixtureId: number;
}

function emptyLine(): StatLine {
  return Object.fromEntries(Object.keys(STAT_KEYS).map((k) => [k, 0])) as unknown as StatLine;
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
    for (const [key, fplKey] of Object.entries(STAT_KEYS)) {
      total[key as keyof StatLine] = el.stats[fplKey as keyof typeof el.stats];
    }

    if (fixtureIds.length === 1) {
      out.push({ playerId: el.id, fixtureId: fixtureIds[0], ...total });
      continue;
    }

    const lines = fixtureIds.map((fixtureId) => {
      const line = emptyLine();
      for (const e of el.explain.filter((x) => x.fixture === fixtureId)) {
        for (const s of e.stats) {
          const key = (Object.keys(STAT_KEYS) as (keyof StatLine)[]).find(
            (k) => STAT_KEYS[k] === s.identifier,
          );
          if (key) line[key] += s.value;
        }
      }
      return { playerId: el.id, fixtureId, ...line };
    });

    const target = lines.findLast((l) => l.minutes > 0) ?? lines[lines.length - 1];
    for (const key of Object.keys(STAT_KEYS) as (keyof StatLine)[]) {
      const split = lines.reduce((sum, l) => sum + l[key], 0);
      if (split < total[key]) target[key] += total[key] - split;
    }
    out.push(...lines);
  }

  return out;
}
