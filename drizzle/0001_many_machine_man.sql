ALTER TABLE `player_fixture_stats` ADD `starts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_fixture_stats` ADD `tackles` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_fixture_stats` ADD `clearances_blocks_interceptions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_fixture_stats` ADD `recoveries` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_fixture_stats` ADD `bps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_fixture_stats` ADD `player_of_the_match` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Re-sync every matchweek so the new columns get filled.
UPDATE `matchweeks` SET `stats_final` = 0;
