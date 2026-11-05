import { STARTERS } from "./rules";
import { POSITIONS, type Position, type SquadRules } from "./types";

/** A starter and the position they fill this round. */
export interface Starter {
  playerId: number;
  position: Position;
}

/** One team's lineup for one round (and so for that round's matchup). */
export interface Lineup {
  /** Name of one of the league's formations, e.g. "4-3-3". */
  formation: string;
  starters: Starter[];
  /** Bench player ids in substitution priority order. */
  bench: number[];
  captainId: number | null;
}

/** Positions each rostered player is listed at (main position first). */
export type Eligibility = Map<number, readonly Position[]>;

function canPlay(eligibility: Eligibility, playerId: number, position: Position): boolean {
  return eligibility.get(playerId)?.includes(position) ?? false;
}

/** Check a lineup against the team's roster and the league's squad rules. */
export function validateLineup(lineup: Lineup, eligibility: Eligibility, squad: SquadRules): string[] {
  const errors: string[] = [];

  const formation = squad.formations.find((f) => f.name === lineup.formation);
  if (!formation) {
    errors.push(`Formation ${lineup.formation} isn't allowed in this league`);
  } else {
    if (lineup.starters.length !== STARTERS) errors.push(`Lineup needs ${STARTERS} starters`);
    for (const pos of POSITIONS) {
      const n = lineup.starters.filter((s) => s.position === pos).length;
      if (n !== formation.slots[pos]) errors.push(`${formation.name} needs ${formation.slots[pos]} ${pos}, got ${n}`);
    }
  }

  for (const s of lineup.starters) {
    if (eligibility.has(s.playerId) && !canPlay(eligibility, s.playerId, s.position)) {
      errors.push(`Player ${s.playerId} isn't listed at ${s.position}`);
    }
  }

  const all = [...lineup.starters.map((s) => s.playerId), ...lineup.bench];
  const ids = new Set(all);
  if (ids.size !== all.length) errors.push("A player is listed more than once");
  for (const id of ids) {
    if (!eligibility.has(id)) errors.push(`Player ${id} is not on this roster`);
  }
  if ([...eligibility.keys()].some((id) => !ids.has(id))) {
    errors.push("Every rostered player must be a starter or on the bench");
  }

  if (squad.captain && lineup.captainId !== null && !lineup.starters.some((s) => s.playerId === lineup.captainId)) {
    errors.push("Captain must be a starter");
  }
  return errors;
}

/**
 * Replace starters who played 0 minutes with the first bench player who played
 * and is listed at the same position, so the formation never changes. Keepers
 * can only be replaced by keepers. Call only once the round's fixtures are done.
 */
export function applyAutoSubs(
  lineup: Lineup,
  eligibility: Eligibility,
  played: (playerId: number) => boolean,
): Lineup {
  const starters = [...lineup.starters];
  const bench = [...lineup.bench];

  for (let i = 0; i < starters.length; i++) {
    const out = starters[i];
    if (played(out.playerId)) continue;
    const b = bench.findIndex((id) => played(id) && canPlay(eligibility, id, out.position));
    if (b === -1) continue;
    starters[i] = { playerId: bench[b], position: out.position };
    bench[b] = out.playerId;
  }

  return { ...lineup, starters, bench };
}

/**
 * Total points for a lineup. `points` scores a player at the position they
 * filled, so a player switched to another listed position scores as that
 * position. The captain's points count twice while they are a starter.
 */
export function lineupPoints(
  lineup: Lineup,
  points: (playerId: number, position: Position) => number,
  squad: SquadRules,
): number {
  let total = 0;
  for (const s of lineup.starters) {
    const p = points(s.playerId, s.position);
    total += squad.captain && s.playerId === lineup.captainId ? p * 2 : p;
  }
  return total;
}
