import { STARTERS } from "./rules";
import { POSITIONS, type Position, type SquadRules } from "./types";

export interface LineupPlayer {
  playerId: number;
  position: Position;
}

export interface Lineup {
  starters: LineupPlayer[];
  /** Bench in substitution priority order. */
  bench: LineupPlayer[];
  captainId: number | null;
}

function countPositions(players: LineupPlayer[]): Record<Position, number> {
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) counts[p.position]++;
  return counts;
}

export function formationErrors(starters: LineupPlayer[], squad: SquadRules): string[] {
  const errors: string[] = [];
  if (starters.length !== STARTERS) errors.push(`Lineup needs ${STARTERS} starters`);
  const counts = countPositions(starters);
  for (const pos of POSITIONS) {
    if (counts[pos] < squad.minStarters[pos]) {
      errors.push(`At least ${squad.minStarters[pos]} ${pos} must start`);
    }
    if (counts[pos] > squad.maxStarters[pos]) {
      errors.push(`At most ${squad.maxStarters[pos]} ${pos} can start`);
    }
  }
  return errors;
}

/** Check a lineup against the team's roster and the league's squad rules. */
export function validateLineup(
  lineup: Lineup,
  rosterIds: Set<number>,
  squad: SquadRules,
): string[] {
  const errors = formationErrors(lineup.starters, squad);
  const all = [...lineup.starters, ...lineup.bench];
  const ids = new Set(all.map((p) => p.playerId));
  if (ids.size !== all.length) errors.push("A player is listed more than once");
  for (const id of ids) {
    if (!rosterIds.has(id)) errors.push(`Player ${id} is not on this roster`);
  }
  if (ids.size !== rosterIds.size) errors.push("Every rostered player must be a starter or on the bench");
  if (squad.captain && lineup.captainId !== null) {
    if (!lineup.starters.some((p) => p.playerId === lineup.captainId)) {
      errors.push("Captain must be a starter");
    }
  }
  return errors;
}

/**
 * Replace starters who played 0 minutes with bench players who did play, in bench
 * order, as long as the formation stays valid. A goalkeeper can only be replaced
 * by a goalkeeper. Call only once every fixture in the matchweek is finished.
 */
export function applyAutoSubs(
  lineup: Lineup,
  played: (playerId: number) => boolean,
  squad: SquadRules,
): Lineup {
  const starters = [...lineup.starters];
  const bench = [...lineup.bench];

  for (let i = 0; i < starters.length; i++) {
    const out = starters[i];
    if (played(out.playerId)) continue;

    for (let b = 0; b < bench.length; b++) {
      const inn = bench[b];
      if (!played(inn.playerId)) continue;
      if ((out.position === "GK") !== (inn.position === "GK")) continue;

      const candidate = [...starters];
      candidate[i] = inn;
      if (formationErrors(candidate, squad).length > 0) continue;

      starters[i] = inn;
      bench[b] = out;
      break;
    }
  }

  return { starters, bench, captainId: lineup.captainId };
}

/**
 * Total points for a lineup; `points` returns a player's matchweek points.
 * The captain's points count twice while they are a starter.
 */
export function lineupPoints(
  lineup: Lineup,
  points: (playerId: number) => number,
  squad: SquadRules,
): number {
  let total = 0;
  for (const p of lineup.starters) total += points(p.playerId);
  if (squad.captain && lineup.captainId !== null) {
    if (lineup.starters.some((p) => p.playerId === lineup.captainId)) {
      total += points(lineup.captainId);
    }
  }
  return total;
}
