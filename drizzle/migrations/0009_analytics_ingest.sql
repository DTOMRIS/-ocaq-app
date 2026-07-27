-- MIGRATION 0009: Analytics Ingest Foundation (add-only)
-- Analiz motorlarından bundle ingest üçün. Mövcud cədvəllərə TOXUNMUR.
-- Preview Neon-da tətbiq edilir; Production yalnız açıq təsdiqlə.

CREATE TABLE IF NOT EXISTS "analytics_ingest" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "period" text NOT NULL,
  "engine_version" text,
  "source_sha256" text NOT NULL,
  "iiko_total" numeric(14, 2),
  "imported_total" numeric(14, 2),
  "reconciled" boolean,
  "quality_status" text,
  "quality_warnings" text,
  "network" text,
  "actions" text,
  "briefings" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "generated_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "analytics_ingest_idem_uq" UNIQUE ("tenant_id", "period", "source_sha256")
);

CREATE TABLE IF NOT EXISTS "analytics_branch" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "ingest_id" uuid NOT NULL REFERENCES "analytics_ingest"("id"),
  "filial" text NOT NULL,
  "bolge" text,
  "branch_id" uuid REFERENCES "branches"("id"),
  "metrics" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "analytics_branch_ingest_idx"
  ON "analytics_branch" ("tenant_id", "ingest_id");
