import type { Position, StatLine } from "@/lib/game/types";

/**
 * A source of real-world data for one competition. Ids are the provider's own;
 * the sync maps them onto database rows. Add a new league or tournament by
 * implementing this and registering it in src/lib/competitions.ts.
 */
export interface DataProvider {
  /** Short name shown in credits, e.g. "Fantasy Premier League". */
  name: string;
  fetchSeason(): Promise<ProviderSeason>;
  /** Per-fixture stats for every player in one round. */
  fetchRoundStats(roundExternalId: number): Promise<ProviderStatLine[]>;
}

export interface ProviderSeason {
  teams: { externalId: number; name: string; shortName: string }[];
  players: {
    externalId: number;
    firstName: string;
    lastName: string;
    webName: string;
    teamExternalId: number;
    position: Position;
    status: string;
    news: string;
  }[];
  rounds: {
    externalId: number;
    name: string;
    stage: string | null;
    deadline: Date;
    finished: boolean;
    isCurrent: boolean;
    isNext: boolean;
    dataChecked: boolean;
  }[];
  fixtures: {
    externalId: number;
    roundExternalId: number | null;
    homeTeamExternalId: number;
    awayTeamExternalId: number;
    kickoff: Date | null;
    started: boolean;
    finished: boolean;
    homeScore: number | null;
    awayScore: number | null;
  }[];
}

export interface ProviderStatLine extends StatLine {
  playerExternalId: number;
  fixtureExternalId: number;
}
