import type { DataProvider } from "../types";
import { fpl } from "./client";
import { markPlayerOfTheMatch, positionMap, splitLiveStats } from "./transform";

/** The public Fantasy Premier League API: free, no key, Premier League only. */
export const fplProvider: DataProvider = {
  name: "Fantasy Premier League",

  async fetchSeason() {
    const [bootstrap, fixtures] = await Promise.all([fpl.bootstrap(), fpl.fixtures()]);
    const positions = positionMap(bootstrap);
    return {
      teams: bootstrap.teams.map((t) => ({ externalId: t.id, name: t.name, shortName: t.short_name })),
      players: bootstrap.elements.flatMap((e) => {
        const position = positions.get(e.element_type);
        if (!position) return [];
        return [
          {
            externalId: e.id,
            firstName: e.first_name,
            lastName: e.second_name,
            webName: e.web_name,
            teamExternalId: e.team,
            position,
            status: e.status,
            news: e.news ?? "",
          },
        ];
      }),
      rounds: bootstrap.events.map((e) => ({
        externalId: e.id,
        name: e.name.replace(/^Gameweek/, "Matchweek"),
        stage: null,
        deadline: new Date(e.deadline_time),
        finished: e.finished,
        isCurrent: e.is_current,
        isNext: e.is_next,
        dataChecked: e.data_checked,
      })),
      fixtures: fixtures.map((f) => ({
        externalId: f.id,
        roundExternalId: f.event,
        homeTeamExternalId: f.team_h,
        awayTeamExternalId: f.team_a,
        kickoff: f.kickoff_time ? new Date(f.kickoff_time) : null,
        started: f.started ?? false,
        finished: f.finished,
        homeScore: f.team_h_score,
        awayScore: f.team_a_score,
      })),
    };
  },

  async fetchRoundStats(roundExternalId) {
    const [live, fixtures] = await Promise.all([fpl.live(roundExternalId), fpl.matchweekFixtures(roundExternalId)]);
    const lines = splitLiveStats(live);
    markPlayerOfTheMatch(lines, fixtures);
    return lines.map(({ playerId, fixtureId, ...stats }) => ({
      ...stats,
      playerExternalId: playerId,
      fixtureExternalId: fixtureId,
    }));
  },
};
