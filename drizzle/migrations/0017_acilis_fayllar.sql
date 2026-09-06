-- 0017 — Açılışa bağlı fayllar (proyekt, smeta, təklif, ölçü, foto, icazə)
--
-- Yalnız CREATE — mövcud sətirlərə toxunmur.
--
-- Fayl özü R2-dədir (`r2_key`), burada yalnız METADATA saxlanılır. Fayllar
-- PRİVATdır: birbaşa URL işləmir, endirmə üçün 5 dəqiqəlik imzalı link verilir.
--
-- NİYƏ FAYLDAN RƏQƏM ÇIXARILMIR: mimari proyekt PDF-i ÇİZGİDİR, mətn deyil.
-- «Masa sayısı 24» orada yazı kimi yox, rəsm kimi durur. OCR bəzən düz oxuyur,
-- bəzən səhv — və səhv oxuduğunu heç kim görmür, sifariş səhv gedir.
-- Fayl SAXLANILIR və AÇILIR; rəqəmlər profil formunda ƏL İLƏ girilir.

create table if not exists "opening_files" (
  "id"          uuid primary key default gen_random_uuid(),
  "tenant_id"   uuid not null references "tenants"("id"),
  "opening_id"  uuid not null references "openings"("id") on delete cascade,

  "kind"        text not null default 'diger',
  -- proyekt | smeta | teklif | olcu | foto | icaze | diger
  "file_name"   text not null,
  "r2_key"      text not null,
  "mime"        text,
  "size"        integer,
  "note"        text,

  "uploaded_by" uuid references "users"("id"),
  "created_at"  timestamp not null default now()
);

create index if not exists "of_open_idx" on "opening_files" ("opening_id","kind");
