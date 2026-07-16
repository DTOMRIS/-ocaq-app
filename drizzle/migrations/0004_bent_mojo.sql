CREATE TYPE "public"."notification_audience" AS ENUM('all', 'role', 'region', 'branch', 'selected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('urgent', 'info', 'task', 'promo');--> statement-breakpoint
CREATE TYPE "public"."shift_briefing_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"audience" "notification_audience" NOT NULL,
	"audience_ref" text,
	"requires_acknowledgement" boolean DEFAULT false NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_briefings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"shift_date" date NOT NULL,
	"shift" text NOT NULL,
	"status" "shift_briefing_status" DEFAULT 'draft' NOT NULL,
	"service_focus" text DEFAULT '' NOT NULL,
	"sales_focus" text DEFAULT '' NOT NULL,
	"sales_target" text DEFAULT '' NOT NULL,
	"quality_focus" text DEFAULT '' NOT NULL,
	"training_completed_count" integer DEFAULT 0 NOT NULL,
	"training_pending_count" integer DEFAULT 0 NOT NULL,
	"manager_note" text DEFAULT '' NOT NULL,
	"handover_note" text DEFAULT '' NOT NULL,
	"created_by" uuid NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_customer_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"briefing_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"note" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN "completed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN "business_date" date;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
UPDATE "checklists" SET "business_date" = ("created_at" AT TIME ZONE 'Asia/Baku')::date WHERE "business_date" IS NULL;--> statement-breakpoint
UPDATE "checklists" SET "idempotency_key" = 'legacy:' || "id"::text WHERE "idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "checklists" ALTER COLUMN "business_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "checklists" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_briefings" ADD CONSTRAINT "shift_briefings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_briefings" ADD CONSTRAINT "shift_briefings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_briefings" ADD CONSTRAINT "shift_briefings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_customer_conversations" ADD CONSTRAINT "shift_customer_conversations_briefing_id_shift_briefings_id_fk" FOREIGN KEY ("briefing_id") REFERENCES "public"."shift_briefings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_customer_conversations" ADD CONSTRAINT "shift_customer_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_customer_conversations" ADD CONSTRAINT "shift_customer_conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_recipient_user_uq" ON "notification_recipients" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "notification_recipient_inbox_idx" ON "notification_recipients" USING btree ("tenant_id","user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_tenant_idempotency_uq" ON "notifications" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_tenant_created_idx" ON "notifications" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_briefing_tenant_branch_date_shift_uq" ON "shift_briefings" USING btree ("tenant_id","branch_id","shift_date","shift");--> statement-breakpoint
CREATE INDEX "shift_briefing_tenant_date_idx" ON "shift_briefings" USING btree ("tenant_id","shift_date");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_customer_conversation_sequence_uq" ON "shift_customer_conversations" USING btree ("briefing_id","sequence");--> statement-breakpoint
CREATE INDEX "shift_customer_conversation_tenant_idx" ON "shift_customer_conversations" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checklists_branch_date_shift_unique" ON "checklists" USING btree ("tenant_id","branch_id","business_date","shift");--> statement-breakpoint
CREATE UNIQUE INDEX "checklists_idempotency_unique" ON "checklists" USING btree ("tenant_id","idempotency_key");
