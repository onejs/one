CREATE TABLE `follows` (
    `id` text PRIMARY KEY NOT NULL,
    `follower_id` text NOT NULL,
    `following_id` text NOT NULL,
    `created_at` double precision DEFAULT NULL,
    FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `likes` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `post_id` text NOT NULL,
    `created_at` double precision DEFAULT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `posts` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `content` text NOT NULL,
    `created_at` double precision DEFAULT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `replies` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `post_id` text NOT NULL,
    `content` text NOT NULL,
    `created_at` double precision DEFAULT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `reposts` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `post_id` text NOT NULL,
    `created_at` double precision DEFAULT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `users` (
    `id` text PRIMARY KEY NOT NULL,
    `username` text NOT NULL,
    `email` text NOT NULL,
    `password_hash` text NOT NULL,
    `bio` text DEFAULT '',
    `avatar_url` text DEFAULT '',
    `created_at` double precision DEFAULT NULL
);

CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
