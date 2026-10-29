# Prem Draft

A free-to-play draft fantasy football game for the Premier League. Friends form a league, hold a
**snake draft** of real Premier League players (each player belongs to one team), set an 11-player
lineup each matchweek, and play **head-to-head**. Players score points from their real match stats.

## Stack

| Part | Choice |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database | SQLite through Drizzle ORM and libSQL (a local file in dev; [Turso](https://turso.tech)'s free tier in production) |
| Data | The public [Fantasy Premier League](https://fantasy.premierleague.com) API: free, no key, Premier League only |
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
| `npm run sync` | Sync season data, then stats for every started matchweek that FPL hasn't confirmed yet |
| `npm run sync -- --matchweek 9` | Re-sync one matchweek's stats |
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
src/lib/game/      Pure game rules (no I/O), all unit tested
  rules.ts           Default scoring and squad rules
  scoring.ts         Points for a player's stats in a fixture / matchweek
  lineup.ts          Formation checks, auto-substitutions, lineup totals
  draft.ts           Snake order, roster limits, autopick
  schedule.ts        Head-to-head round-robin schedule
src/lib/fpl/       FPL API client (validated with zod), stat transform, sync
src/lib/db/        Drizzle schema and client
src/lib/queries.ts Read queries used by pages
src/app/           Pages: home, players, player detail, fixtures, scoring
scripts/sync.ts    CLI for the data sync
drizzle/           SQL migrations
```

## Game rules (defaults; stored per league so they can be changed)

- **Squad:** 15 players: 2 GK, 5 DEF, 5 MID, 3 FWD.
- **Lineup:** 11 starters: 1 GK, at least 3 DEF, 2 MID and 1 FWD. A captain scores double.
- **Auto-subs:** a starter with 0 minutes is replaced by the first bench player who played, if
  the formation stays legal. Goalkeepers only swap with goalkeepers.
- **Scoring:** modelled on official FPL. See `/scoring` in the app or `src/lib/game/rules.ts`.

## About the data source

The FPL API is free but unofficial and undocumented. It can change between seasons, so every
response is validated and the sync fails loudly instead of saving bad data. FPL may correct
stats for a day or two after a matchweek. The sync keeps re-pulling a matchweek until FPL marks
it `data_checked`.

## Roadmap

- [x] Data sync from FPL (clubs, players, matchweeks, fixtures, per-fixture stats)
- [x] Scoring engine, lineup/auto-sub rules, snake draft rules, H2H schedule (with tests)
- [x] Player list, player points breakdown, fixtures, scoring pages
- [ ] Accounts and sign-in
- [ ] Create and join leagues (invite code), commissioner settings
- [ ] Live draft room (real-time picks, timer, queue, autopick)
- [ ] Lineup editor with matchweek deadline lock
- [ ] Matchweek scoring job: auto-subs, matchups, league table
- [ ] Waivers and free agents
- [ ] Trades
- [ ] Notifications
- [ ] Deployment (Vercel + Turso) with scheduled sync
