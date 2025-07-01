ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'pending_payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer,
	"alert_type" varchar(50) NOT NULL,
	"message" text,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_alerts" ADD CONSTRAINT "admin_alerts_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;