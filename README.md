## Stack

| Part | Choice |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database | SQLite through Drizzle ORM and libSQL (a local file in dev; [Turso](https://turso.tech)'s free tier in production) |
| Data | One provider per competition. Premier League: the public [Fantasy Premier League](https://fantasy.premierleague.com) API (free, no key) |
| Tests | Vitest |

## Getting started

Requires Node 22+.

```bash
npm install
npm run db:migrate   # creates local.db
npm run sync         # pulls clubs, players, fixtures and stats from FPL
npm run dev          # http://localhost:3000
```

### Commands

| Command | What it does |
|---|---|
| `npm run sync` | For every live competition: sync season data, then stats for every started round that isn't confirmed yet |
| `npm run sync -- premier-league` | Sync one competition |
| `npm run sync -- premier-league --round 9` | Re-sync one round's stats (the provider's round number) |
| `npm run balance` | Show the draft order the scoring rules produce on real stats (`-- premier-league --teams 12`) |
| `npm test` | Unit tests |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:local.db` | libSQL URL, e.g. `libsql://<db>.turso.io` |
| `DATABASE_AUTH_TOKEN` | – | Turso token |
| `FPL_API_URL` | `https://fantasy.premierleague.com/api` | Override for testing |

## Project layout

```
src/lib/competitions.ts  The list of competitions: rules, labels, data provider, live / coming soon
src/lib/game/            Pure game rules (no I/O), all unit tested
  rules.ts                 Default scoring, formations and squad rules
  scoring.ts               Points for a player's stats in a fixture / round
  lineup.ts                Formation and position checks, auto-subs, lineup totals
  draft.ts                 Snake order, roster limits, autopick
  schedule.ts              Head-to-head round-robin schedule
src/lib/providers/       Data sources: the DataProvider interface, plus fpl/ (Premier League)
src/lib/sync.ts          Generic sync: any provider into the database
src/lib/db/              Drizzle schema and client
src/lib/queries.ts       Read queries used by pages
src/app/                 Home (choose a game) and /<competition>/… pages
scripts/                 sync and balance commands
drizzle/                 SQL migrations
```

## Competitions

Each competition in `src/lib/competitions.ts` has its own URL (`/premier-league`, `/world-cup`, …),
default rules, labels ("Matchweek" vs "Matchday", "Club" vs "Nation") and data provider. All
real-world tables (`real_teams`, `players`, `rounds`, `fixtures`, stats) carry a `competition_id`
and the provider's own `external_id`.

To add one:

1. Implement `DataProvider` (`src/lib/providers/types.ts`) for its data source.
2. Add or update its entry in `COMPETITIONS` and set `status: "live"`.
3. Run `npm run sync -- <id>`.

Tournaments use `kind: "tournament"`. Rounds have an optional `stage` ("Group stage",
"Quarter-finals") and squads cap players per nation (`maxPerTeam`).

## About the data source

The FPL API (Premier League) is free but unofficial and undocumented. It can change between seasons, so every
response is validated and the sync fails loudly instead of saving bad data. FPL may correct
stats for a day or two after a matchweek. The sync keeps re-pulling a matchweek until FPL marks
it `data_checked`.

## Roadmap

See [ROADMAP.md](ROADMAP.md).
