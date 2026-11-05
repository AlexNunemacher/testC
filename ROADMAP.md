# Roadmap: what's left to run the site publicly

## Done

- Competitions as separate games: Premier League live; La Liga, Euro 2028 and World Cup 2030
  registered as coming soon
- Data sync for the Premier League from the FPL API: teams, players, rounds, fixtures and
  per-fixture stats including tackles, starts, BPS and player of the match
- Game rules, all unit tested:
  - scoring, rebalanced for a draft
  - formations (4-4-2 / 4-3-3 with a mandatory keeper)
  - switching players to positions they're listed at
  - auto-subs
  - snake draft order, roster limits and autopick
  - head-to-head schedule
- Database tables for leagues, teams, draft picks, rosters, per-round lineups with formation, and
  matchups
- Pages for each competition: overview, player list with filters, player points breakdown,
  fixtures, scoring rules

## 1. Needed before launch

### Real data check
- [ ] Run `npm run sync` against the live FPL API (blocked in the dev sandbox so far) and fix
      anything its real responses break
- [ ] Run `npm run balance` and tune the scoring until strikers go first and top defenders go late
      in round 1 or early in round 2
- [ ] Check double and blank matchweeks, postponed fixtures and mid-season transfers on real data
- [ ] Cache and throttle FPL requests; FPL blocks clients that call it too often

### Accounts
- [ ] Sign-in: email magic link plus Google (e.g. Auth.js or Better Auth)
- [ ] Profile: display name, delete account
- [ ] Server-side permission checks on every action: you can only change your own team, and only
      the commissioner can change league settings

### Leagues
- [ ] Create a league: competition, name, size, format (head-to-head or total points), start round
- [ ] Join by invite link or code; leave; commissioner can remove teams
- [ ] Commissioner settings: edit scoring values, allowed formations and roster sizes, checked with
      `squadRuleErrors`. Lock the settings once the draft starts.
- [ ] League home page: teams, schedule, standings, recent activity

### Draft room
- [ ] Schedule the draft and randomize the order
- [ ] Real-time picks. Vercel's free tier can't hold WebSockets open, so use a hosted realtime
      service (e.g. Ably, Pusher, PartyKit or Supabase Realtime) or a small always-on server.
- [ ] Pick timer enforced on the server, with autopick on timeout (the logic exists)
- [ ] Manager's player queue, draft board, available-player list with filters
- [ ] Commissioner pause, resume and undo
- [ ] Turn draft picks into rosters when the draft ends, and generate the head-to-head schedule
      (the logic exists)

### Lineups
- [ ] Lineup editor:
  - choose 4-4-2 or 4-3-3
  - put players in slots, including switching to their other listed positions
  - choose a captain
  - order the bench
- [ ] Lock lineups at the round deadline; changes after that are rejected on the server
- [ ] Carry the last lineup into the next round; auto-fill a valid lineup for inactive managers

### Matchups and standings
- [ ] Scoring job each round: apply auto-subs, total each lineup at its slot positions, score
      matchups (the logic exists; it needs wiring to the database)
- [ ] Live matchup scores while games are on; finalize once the provider confirms the stats, and
      re-score after any late correction
- [ ] Standings: wins, draws, losses, points for and against, tiebreakers
- [ ] Playoffs: decide the format (e.g. top 4, last 3 matchweeks)
- [ ] Total-points league format as an option

### Free agents, waivers and trades
- [ ] Add and drop free agents, enforcing roster limits
- [ ] Waivers: claim window after drops and before each round, priority order, processed by a job
- [ ] Trades: propose, accept or reject, review period or commissioner approval, trade deadline

### Jobs and hosting
- [ ] Scheduled jobs: data sync (every 15–60 minutes, more often during matches), round scoring,
      waiver processing, draft timers (e.g. Vercel Cron, GitHub Actions or a small worker)
- [ ] Deploy: Vercel for the app and Turso for the database, both on free tiers. Set up env vars,
      run migrations on deploy and take backups.
- [ ] Domain name and HTTPS
- [ ] Error tracking (e.g. Sentry) and uptime monitoring, plus an alert when the sync fails

### Quality
- [ ] CI on GitHub Actions: lint, typecheck, tests and build on every push
- [ ] Integration tests for database flows: draft, lineup lock, scoring job, waivers
- [ ] End-to-end browser tests: a draft with several users at once
- [ ] Phone layout pass on every page; installable app (PWA); accessibility check

### Admin
- [ ] Admin pages: edit a player's extra listed positions, fix a stat line, re-run a round's
      scoring, re-sync a competition

### Legal
- [ ] Privacy policy and terms of service
- [ ] Cookie notice if analytics are added
- [ ] No club crests, league logos or player photos without a licence; keep the "not affiliated"
      notice
- [ ] Confirm the FPL data can be used on a public site; plan a paid provider if not

## 2. Soon after launch

- [ ] Email notifications (e.g. Resend): draft starting, your pick, lineup deadline, waiver results,
      trade offers, weekly results
- [ ] Browser push notifications
- [ ] League chat and activity feed
- [ ] Player news and injury flags in the lineup editor
- [ ] Season history and trophies

## 3. More competitions

### La Liga
- [ ] Choose a data provider. There is no free official fantasy API like FPL; candidates are
      API-Football (small free tier) and Sportmonks (paid).
- [ ] Implement a `DataProvider` for it and map its positions and stats
- [ ] Rework scoring for the stats it does and doesn't have. Tackles or BPS may be missing, so
      player of the match might come from the provider's own match rating.

### Euros and World Cup
- [ ] Choose a data provider for international matches
- [ ] Tournament rounds: group matchdays then knockout stages (`rounds.stage`)
- [ ] Rules for eliminated nations: players stop scoring, so add free-agent or waiver windows
      between stages, or a re-draft
- [ ] Short-format leagues: draft right before the tournament, fewer rounds, playoffs that fit the
      schedule
- [ ] Per-nation roster cap (set to 3 by default)

### Special modes (ideas)
- [ ] More formations as a league option (e.g. 3-5-2, 5-3-2)
- [ ] Keeper and dynasty leagues that carry players into next season
- [ ] Best-ball mode, where the best possible lineup is picked automatically
