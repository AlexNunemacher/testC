import { z } from "zod";

/**
 * Client for the public (unofficial, undocumented) Fantasy Premier League API.
 * It needs no key, but its shape can change between seasons, so every response
 * is validated and a change fails loudly instead of writing bad data.
 */
const BASE_URL = process.env.FPL_API_URL ?? "https://fantasy.premierleague.com/api";

const bootstrapSchema = z.object({
  teams: z.array(z.object({ id: z.number(), name: z.string(), short_name: z.string() })),
  element_types: z.array(z.object({ id: z.number(), singular_name_short: z.string() })),
  elements: z.array(
    z.object({
      id: z.number(),
      first_name: z.string(),
      second_name: z.string(),
      web_name: z.string(),
      team: z.number(),
      element_type: z.number(),
      status: z.string(),
      news: z.string().nullish(),
    }),
  ),
  events: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      deadline_time: z.string(),
      finished: z.boolean(),
      is_current: z.boolean(),
      is_next: z.boolean(),
      data_checked: z.boolean(),
    }),
  ),
});

const fixturesSchema = z.array(
  z.object({
    id: z.number(),
    event: z.number().nullable(),
    team_h: z.number(),
    team_a: z.number(),
    kickoff_time: z.string().nullable(),
    started: z.boolean().nullable(),
    finished: z.boolean(),
    team_h_score: z.number().nullable(),
    team_a_score: z.number().nullable(),
  }),
);

const count = z.number().optional().default(0);

export const liveStatsSchema = z.object({
  minutes: count,
  goals_scored: count,
  assists: count,
  clean_sheets: count,
  goals_conceded: count,
  own_goals: count,
  penalties_saved: count,
  penalties_missed: count,
  yellow_cards: count,
  red_cards: count,
  saves: count,
  bonus: count,
  defensive_contribution: count,
});

const liveSchema = z.object({
  elements: z.array(
    z.object({
      id: z.number(),
      stats: liveStatsSchema,
      explain: z.array(
        z.object({
          fixture: z.number(),
          stats: z.array(z.object({ identifier: z.string(), value: z.number() })),
        }),
      ),
    }),
  ),
});

export type FplBootstrap = z.infer<typeof bootstrapSchema>;
export type FplFixture = z.infer<typeof fixturesSchema>[number];
export type FplLive = z.infer<typeof liveSchema>;

async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": "fantasy-prem-draft/0.1", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FPL API ${path} returned ${res.status}`);
  return schema.parse(await res.json());
}

export const fpl = {
  bootstrap: () => get("/bootstrap-static/", bootstrapSchema),
  fixtures: () => get("/fixtures/", fixturesSchema),
  live: (matchweek: number) => get(`/event/${matchweek}/live/`, liveSchema),
};

export const fplSchemas = { bootstrapSchema, fixturesSchema, liveSchema };
