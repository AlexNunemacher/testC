import { rosterTotal } from "./rules";
import type { Position, SquadRules } from "./types";

export interface DraftablePlayer {
  id: number;
  position: Position;
  clubId: number;
}

/** Which team (by index into `draftOrder`) makes the given overall pick (0-based). */
export function snakePickOwner(overallPick: number, draftOrder: number[]): number {
  const teams = draftOrder.length;
  const round = Math.floor(overallPick / teams);
  const indexInRound = overallPick % teams;
  const slot = round % 2 === 0 ? indexInRound : teams - 1 - indexInRound;
  return draftOrder[slot];
}

export function totalPicks(teamCount: number, squad: SquadRules): number {
  return teamCount * rosterTotal(squad);
}

/** Reasons a team can't draft this player (empty if allowed). */
export function draftErrors(
  player: DraftablePlayer,
  roster: DraftablePlayer[],
  squad: SquadRules,
): string[] {
  const errors: string[] = [];
  const samePosition = roster.filter((p) => p.position === player.position).length;
  if (samePosition >= squad.rosterSize[player.position]) {
    errors.push(`Roster already has ${squad.rosterSize[player.position]} ${player.position}`);
  }
  if (squad.maxPerClub !== null) {
    const sameClub = roster.filter((p) => p.clubId === player.clubId).length;
    if (sameClub >= squad.maxPerClub) {
      errors.push(`Roster already has ${squad.maxPerClub} players from this club`);
    }
  }
  if (roster.some((p) => p.id === player.id)) errors.push("Player already on roster");
  return errors;
}

/**
 * Pick for a team that is out of time: the first legal player in its queue,
 * otherwise the highest-ranked legal player. `ranked` is the available pool,
 * best first; `queue` holds player ids in the manager's preferred order.
 */
export function autoPick(
  queue: number[],
  ranked: DraftablePlayer[],
  roster: DraftablePlayer[],
  squad: SquadRules,
): DraftablePlayer | null {
  const byId = new Map(ranked.map((p) => [p.id, p]));
  for (const id of queue) {
    const p = byId.get(id);
    if (p && draftErrors(p, roster, squad).length === 0) return p;
  }
  return ranked.find((p) => draftErrors(p, roster, squad).length === 0) ?? null;
}

/** Fisher–Yates shuffle for a random draft order. */
export function randomDraftOrder(teamIds: number[], random = Math.random): number[] {
  const order = [...teamIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
