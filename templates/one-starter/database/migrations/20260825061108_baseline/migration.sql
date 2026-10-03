CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `appNotification` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`workflow` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`destinationKind` text NOT NULL,
	`destinationId` text,
	`createdAt` integer NOT NULL,
	`readAt` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `comment` (
	`id` text PRIMARY KEY,
	`postId` text NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jwks` (
	`id` text PRIMARY KEY,
	`publicKey` text NOT NULL,
	`privateKey` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notificationPreference` (
	`userId` text NOT NULL,
	`workflow` text NOT NULL,
	`foregroundToastEnabled` integer DEFAULT true NOT NULL,
	`systemPushEnabled` integer DEFAULT true NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `notificationPreference_pk` PRIMARY KEY(`userId`, `workflow`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `post` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`image` text NOT NULL,
	`imageWidth` integer,
	`imageHeight` integer,
	`caption` text,
	`commentCount` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	CONSTRAINT `fk_session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY,
	`name` text,
	`email` text NOT NULL UNIQUE,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `userPublic` (
	`id` text PRIMARY KEY,
	`name` text,
	`username` text,
	`image` text,
	`joinedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `appNotification_userId_createdAt_id_idx` ON `appNotification` (`userId`,`createdAt`,`id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `appNotification_userId_readAt_createdAt_idx` ON `appNotification` (`userId`,`readAt`,`createdAt`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `comment_postId_createdAt_idx` ON `comment` (`postId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `comment_postId_idx` ON `comment` (`postId`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `comment_userId_idx` ON `comment` (`userId`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `post_createdAt_id_idx` ON `post` (`createdAt`,`id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `post_userId_idx` ON `post` (`userId`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `userPublic_username_idx` ON `userPublic` (`username`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS "_orez_aggregate_postCommentCount_delete" AFTER DELETE ON "comment" BEGIN UPDATE "post" SET "commentCount" = "commentCount" - 1 WHERE "id" IS OLD."postId"; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS "_orez_aggregate_postCommentCount_insert" AFTER INSERT ON "comment" BEGIN UPDATE "post" SET "commentCount" = "commentCount" + 1 WHERE "id" IS NEW."postId"; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS "_orez_aggregate_postCommentCount_update" AFTER UPDATE OF "postId" ON "comment" BEGIN UPDATE "post" SET "commentCount" = "commentCount" - 1 WHERE "id" IS OLD."postId" AND NOT (OLD."postId" IS NEW."postId"); UPDATE "post" SET "commentCount" = "commentCount" + 1 WHERE "id" IS NEW."postId" AND NOT (OLD."postId" IS NEW."postId"); END;
