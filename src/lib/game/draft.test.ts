import { describe, expect, it } from "vitest";
import { autoPick, draftErrors, randomDraftOrder, snakePickOwner, totalPicks, type DraftablePlayer } from "./draft";
import { DEFAULT_SQUAD } from "./rules";

describe("snakePickOwner", () => {
  it("reverses the order every round", () => {
    const order = [10, 20, 30, 40];
    const picks = Array.from({ length: 12 }, (_, i) => snakePickOwner(i, order));
    expect(picks).toEqual([10, 20, 30, 40, 40, 30, 20, 10, 10, 20, 30, 40]);
  });

  it("gives every team the same number of picks", () => {
    const order = [1, 2, 3, 4, 5, 6, 7];
    const n = totalPicks(order.length, DEFAULT_SQUAD);
    expect(n).toBe(7 * 15);
    const counts = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const t = snakePickOwner(i, order);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    expect([...counts.values()].every((c) => c === 15)).toBe(true);
  });
});

const gk = (id: number, clubId = 1): DraftablePlayer => ({ id, position: "GK", clubId });
const fwd = (id: number, clubId = 1): DraftablePlayer => ({ id, position: "FWD", clubId });

describe("draftErrors", () => {
  it("enforces positional roster limits", () => {
    expect(draftErrors(gk(3), [gk(1), gk(2)], DEFAULT_SQUAD)).toEqual(["Roster already has 2 GK"]);
    expect(draftErrors(fwd(3), [gk(1), gk(2)], DEFAULT_SQUAD)).toEqual([]);
  });

  it("enforces the per-club limit when set", () => {
    const squad = { ...DEFAULT_SQUAD, maxPerClub: 1 };
    expect(draftErrors(fwd(2, 7), [gk(1, 7)], squad)).toEqual(["Roster already has 1 players from this club"]);
  });
});

describe("autoPick", () => {
  const ranked = [gk(1), fwd(2), fwd(3)];

  it("uses the manager's queue first", () => {
    expect(autoPick([3, 2], ranked, [], DEFAULT_SQUAD)?.id).toBe(3);
  });

  it("skips queued players that are gone or illegal, then falls back to rankings", () => {
    const roster = [gk(10), gk(11)];
    expect(autoPick([99, 1], ranked, roster, DEFAULT_SQUAD)?.id).toBe(2);
  });

  it("returns null when nobody fits", () => {
    expect(autoPick([], [gk(1)], [gk(10), gk(11)], DEFAULT_SQUAD)).toBeNull();
  });
});

describe("randomDraftOrder", () => {
  it("is a permutation of the teams", () => {
    const order = randomDraftOrder([1, 2, 3, 4, 5]);
    expect([...order].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
