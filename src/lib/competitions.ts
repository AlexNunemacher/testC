import { DEFAULT_SCORING, DEFAULT_SQUAD } from "@/lib/game/rules";
import type { ScoringRules, SquadRules } from "@/lib/game/types";
import { fplProvider } from "@/lib/providers/fpl";
import type { DataProvider } from "@/lib/providers/types";

/**
 * A kind of fantasy game: one real-world competition with its own data source,
 * default rules and pages under /<id>. Leagues copy `scoring` and `squad` when
 * they're created, so commissioners can still change them per league.
 */
export interface Competition {
  /** URL slug and database id. */
  id: string;
  name: string;
  /** "league": a full season of matchweeks. "tournament": groups then knockouts. */
  kind: "league" | "tournament";
  season: string;
  /** "live" competitions are synced and playable; others show as coming soon. */
  status: "live" | "coming-soon";
  /** What a scoring period is called, e.g. "Matchweek" or "Matchday". */
  roundLabel: string;
  /** What a real-world team is called, e.g. "Club" or "Nation". */
  teamLabel: string;
  description: string;
  scoring: ScoringRules;
  squad: SquadRules;
  /** null until a data source is chosen. */
  provider: DataProvider | null;
}

export const COMPETITIONS: Competition[] = [
  {
    id: "premier-league",
    name: "Premier League",
    kind: "league",
    season: "2026/27",
    status: "live",
    roundLabel: "Matchweek",
    teamLabel: "Club",
    description: "Draft a squad from all 20 clubs and play head-to-head every matchweek.",
    scoring: DEFAULT_SCORING,
    squad: DEFAULT_SQUAD,
    provider: fplProvider,
  },
  {
    id: "la-liga",
    name: "La Liga",
    kind: "league",
    season: "2026/27",
    status: "coming-soon",
    roundLabel: "Matchweek",
    teamLabel: "Club",
    description: "Spain's top flight. Needs a data source: La Liga has no free public API like FPL.",
    scoring: DEFAULT_SCORING,
    squad: DEFAULT_SQUAD,
    provider: null,
  },
  {
    id: "euros",
    name: "Euro 2028",
    kind: "tournament",
    season: "2028",
    status: "coming-soon",
    roundLabel: "Matchday",
    teamLabel: "Nation",
    description: "A short draft for the European Championship: group stage then knockouts.",
    scoring: DEFAULT_SCORING,
    // Nations are knocked out, so cap how many players a roster can take from one.
    squad: { ...DEFAULT_SQUAD, maxPerTeam: 3 },
    provider: null,
  },
  {
    id: "world-cup",
    name: "World Cup 2030",
    kind: "tournament",
    season: "2030",
    status: "coming-soon",
    roundLabel: "Matchday",
    teamLabel: "Nation",
    description: "Draft from every nation at the World Cup: group stage then knockouts.",
    scoring: DEFAULT_SCORING,
    squad: { ...DEFAULT_SQUAD, maxPerTeam: 3 },
    provider: null,
  },
];

export function getCompetition(id: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.id === id);
}

export function liveCompetitions(): Competition[] {
  return COMPETITIONS.filter((c) => c.status === "live" && c.provider !== null);
}
