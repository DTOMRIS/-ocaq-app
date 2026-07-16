ALTER TABLE "invitations" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "revoked_reason" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "replaces_manager_id" uuid;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "archived_by" uuid;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_replaces_manager_id_users_id_fk" FOREIGN KEY ("replaces_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_live_branch_manager_uq" ON "invitations" USING btree ("tenant_id","branch_id") WHERE "invitations"."role" = 'branch_manager' AND "invitations"."accepted_at" IS NULL AND "invitations"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_tenant_code_uq" ON "branches" USING btree ("tenant_id","code");