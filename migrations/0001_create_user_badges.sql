CREATE TYPE "badge_level" AS ENUM('bronze', 'silver', 'gold', 'platinum');
--> statement-breakpoint
CREATE TYPE "badge_type" AS ENUM('meal', 'exercise', 'medication');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_type" "badge_type" NOT NULL,
	"badge_level" "badge_level" NOT NULL,
	"earned_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_badge_unique_idx" ON "user_badges" ("user_id","badge_type","badge_level");