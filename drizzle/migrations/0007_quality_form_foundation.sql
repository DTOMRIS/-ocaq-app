-- OCAQ rəsmi keyfiyyət formaları — yalnız əlavə edən, geri dönən migration.
-- Production-a avtomatik tətbiq edilmir. Əvvəl backup + preflight tələb olunur.

CREATE TABLE IF NOT EXISTS "quality_form_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "branch_id" uuid NOT NULL REFERENCES "branches"("id"),
  "form_key" text NOT NULL,
  "document_number" text NOT NULL,
  "form_variant" text,
  "template_revision" text NOT NULL,
  "template_sha256" text NOT NULL,
  "record_revision" integer DEFAULT 1 NOT NULL,
  "replaces_submission_id" uuid,
  "correction_reason" text,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "payload_json" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "submitted_by" uuid REFERENCES "users"("id"),
  "submitted_at" timestamp,
  "approved_by" uuid REFERENCES "users"("id"),
  "approved_at" timestamp,
  "voided_by" uuid REFERENCES "users"("id"),
  "voided_at" timestamp,
  "void_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "quality_form_period_order_ck" CHECK ("period_end" >= "period_start"),
  CONSTRAINT "quality_form_status_ck" CHECK ("status" IN ('draft', 'submitted', 'approved', 'voided')),
  CONSTRAINT "quality_form_revision_ck" CHECK ("record_revision" >= 1),
  CONSTRAINT "quality_form_correction_reason_ck" CHECK (
    ("record_revision" = 1 AND "replaces_submission_id" IS NULL)
    OR
    ("record_revision" > 1 AND "replaces_submission_id" IS NOT NULL AND length(trim("correction_reason")) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "quality_form_submission_idempotency_uq"
  ON "quality_form_submissions" ("tenant_id", "idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "quality_form_submission_revision_uq"
  ON "quality_form_submissions" (
    "tenant_id", "branch_id", "form_key", "period_start", "period_end", "record_revision"
  );
CREATE INDEX IF NOT EXISTS "quality_form_submission_scope_idx"
  ON "quality_form_submissions" ("tenant_id", "branch_id", "form_key", "period_start");
CREATE INDEX IF NOT EXISTS "quality_form_submission_status_idx"
  ON "quality_form_submissions" ("tenant_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "quality_form_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "submission_id" uuid NOT NULL REFERENCES "quality_form_submissions"("id"),
  "actor_id" uuid NOT NULL REFERENCES "users"("id"),
  "action" text NOT NULL,
  "reason" text,
  "snapshot_json" text NOT NULL,
  "ip" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "quality_form_event_action_ck" CHECK (
    "action" IN ('created', 'submitted', 'approved', 'correction_created', 'printed', 'voided')
  )
);

CREATE INDEX IF NOT EXISTS "quality_form_event_timeline_idx"
  ON "quality_form_events" ("tenant_id", "submission_id", "created_at");

ALTER TABLE "quality_form_submissions"
  DROP CONSTRAINT IF EXISTS "quality_form_submission_replaces_fk";
ALTER TABLE "quality_form_submissions"
  ADD CONSTRAINT "quality_form_submission_replaces_fk"
  FOREIGN KEY ("replaces_submission_id") REFERENCES "quality_form_submissions"("id");
