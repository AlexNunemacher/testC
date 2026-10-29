CREATE TABLE `clubs` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `draft_picks` (
	`league_id` integer NOT NULL,
	`overall` integer NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`auto` integer DEFAULT false NOT NULL,
	`made_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`league_id`, `overall`),
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `fantasy_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draft_league_player_uq` ON `draft_picks` (`league_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `draft_queue` (
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`rank` integer NOT NULL,
	PRIMARY KEY(`team_id`, `player_id`),
	FOREIGN KEY (`team_id`) REFERENCES `fantasy_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fantasy_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_league_user_uq` ON `fantasy_teams` (`league_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` integer PRIMARY KEY NOT NULL,
	`matchweek_id` integer,
	`home_club_id` integer NOT NULL,
	`away_club_id` integer NOT NULL,
	`kickoff` integer,
	`started` integer NOT NULL,
	`finished` integer NOT NULL,
	`home_score` integer,
	`away_score` integer,
	FOREIGN KEY (`matchweek_id`) REFERENCES `matchweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fixtures_matchweek_idx` ON `fixtures` (`matchweek_id`);--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`commissioner_id` integer NOT NULL,
	`format` text DEFAULT 'h2h' NOT NULL,
	`max_teams` integer NOT NULL,
	`squad_rules` text NOT NULL,
	`scoring_rules` text NOT NULL,
	`start_matchweek` integer NOT NULL,
	`draft_status` text DEFAULT 'scheduled' NOT NULL,
	`draft_at` integer,
	`pick_seconds` integer DEFAULT 90 NOT NULL,
	`draft_order` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`commissioner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_invite_code_unique` ON `leagues` (`invite_code`);--> statement-breakpoint
CREATE TABLE `lineup_slots` (
	`team_id` integer NOT NULL,
	`matchweek_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`team_id`, `matchweek_id`, `player_id`),
	FOREIGN KEY (`team_id`) REFERENCES `fantasy_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matchweek_id`) REFERENCES `matchweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matchups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`matchweek_id` integer NOT NULL,
	`home_team_id` integer NOT NULL,
	`away_team_id` integer,
	`home_points` integer,
	`away_points` integer,
	`final` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matchweek_id`) REFERENCES `matchweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_team_id`) REFERENCES `fantasy_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `fantasy_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `matchups_league_mw_idx` ON `matchups` (`league_id`,`matchweek_id`);--> statement-breakpoint
CREATE TABLE `matchweeks` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`deadline` integer NOT NULL,
	`finished` integer NOT NULL,
	`is_current` integer NOT NULL,
	`is_next` integer NOT NULL,
	`data_checked` integer NOT NULL,
	`stats_final` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_fixture_stats` (
	`player_id` integer NOT NULL,
	`fixture_id` integer NOT NULL,
	`matchweek_id` integer NOT NULL,
	`minutes` integer NOT NULL,
	`goals_scored` integer NOT NULL,
	`assists` integer NOT NULL,
	`clean_sheets` integer NOT NULL,
	`goals_conceded` integer NOT NULL,
	`own_goals` integer NOT NULL,
	`penalties_saved` integer NOT NULL,
	`penalties_missed` integer NOT NULL,
	`yellow_cards` integer NOT NULL,
	`red_cards` integer NOT NULL,
	`saves` integer NOT NULL,
	`bonus` integer NOT NULL,
	`defensive_contribution` integer NOT NULL,
	PRIMARY KEY(`player_id`, `fixture_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matchweek_id`) REFERENCES `matchweeks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stats_matchweek_idx` ON `player_fixture_stats` (`matchweek_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`web_name` text NOT NULL,
	`club_id` integer NOT NULL,
	`position` text NOT NULL,
	`status` text NOT NULL,
	`news` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `players_club_idx` ON `players` (`club_id`);--> statement-breakpoint
CREATE INDEX `players_position_idx` ON `players` (`position`);--> statement-breakpoint
CREATE TABLE `roster_slots` (
	`league_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`acquired_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`league_id`, `player_id`),
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `fantasy_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `roster_team_idx` ON `roster_slots` (`team_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);