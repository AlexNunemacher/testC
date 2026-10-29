export interface Pairing {
  home: number;
  /** null when the home team has a bye (odd number of teams). */
  away: number | null;
}

/**
 * Head-to-head schedule using the circle method: every team plays every other
 * team once per cycle, and cycles repeat (alternating home/away) until
 * `matchweeks` rounds are filled.
 */
export function roundRobin(teamIds: number[], matchweeks: number): Pairing[][] {
  if (teamIds.length < 2) return Array.from({ length: matchweeks }, () => []);

  const slots: (number | null)[] = [...teamIds];
  if (slots.length % 2 === 1) slots.push(null);
  const n = slots.length;

  const cycle: Pairing[][] = [];
  const rotating = slots.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round = [slots[0], ...rotating];
    const pairings: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      let a = round[i];
      let b = round[n - 1 - i];
      if (r % 2 === 1 && i === 0) [a, b] = [b, a];
      if (a === null && b === null) continue;
      if (a === null) pairings.push({ home: b!, away: null });
      else if (b === null) pairings.push({ home: a, away: null });
      else pairings.push({ home: a, away: b });
    }
    cycle.push(pairings);
    rotating.unshift(rotating.pop()!);
  }

  const schedule: Pairing[][] = [];
  for (let w = 0; w < matchweeks; w++) {
    const pass = Math.floor(w / cycle.length);
    const round = cycle[w % cycle.length];
    schedule.push(
      pass % 2 === 0
        ? round
        : round.map((p) => (p.away === null ? p : { home: p.away, away: p.home })),
    );
  }
  return schedule;
}
