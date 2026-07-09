ALTER TABLE "invitations" ADD COLUMN "region_id" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;