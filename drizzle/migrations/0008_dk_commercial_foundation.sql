ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "invitations" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "external_customer_id" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan_code" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "provisioned_by" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "provisioned_at" timestamp;
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_external_customer_id_uq"
  ON "tenants" ("external_customer_id")
  WHERE "external_customer_id" IS NOT NULL;

ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'manual';
