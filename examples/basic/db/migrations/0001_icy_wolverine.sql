ALTER TABLE "follows" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN "created_at" timestamp DEFAULT now();