ALTER TABLE `galaxies` ADD `join_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `galaxies_join_code_unique` ON `galaxies` (`join_code`);