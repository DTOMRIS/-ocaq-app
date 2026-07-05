CREATE TYPE "public"."complaint_channel" AS ENUM('wolt', 'bolt', 'phone', 'whatsapp', 'instagram', 'in_store', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_category" AS ENUM('late_delivery', 'missing_item', 'wrong_item', 'cold_food', 'packaging', 'courier_behavior', 'food_quality', 'refund', 'pricing', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_priority" AS ENUM('low', 'normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('new', 'in_review', 'sent_to_branch', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."complaint_fault" AS ENUM('unknown', 'restaurant', 'platform', 'courier', 'customer');--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"created_by" uuid,
	"assigned_to" uuid,
	"channel" "complaint_channel" NOT NULL,
	"category" "complaint_category" NOT NULL,
	"priority" "complaint_priority" DEFAULT 'normal' NOT NULL,
	"status" "complaint_status" DEFAULT 'new' NOT NULL,
	"fault" "complaint_fault" DEFAULT 'unknown' NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"platform_order_id" text,
	"order_total" numeric(10, 2),
	"refund_amount" numeric(10, 2),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"action_taken" text,
	"resolution_note" text,
	"response_due_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
