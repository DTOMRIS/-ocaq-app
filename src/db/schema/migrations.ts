import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core'

/**
 * ƏL İLƏ TƏTBİQ OLUNAN MIGRATION QEYDİYYATI.
 *
 * NİYƏ DRIZZLE-IN ÖZ CƏDVƏLİ DEYİL: `drizzle/migrations/meta/_journal.json`
 * bu repoda **0007-də donub**. 0001_complaints və 0008–0025 ƏL İLƏ yazılmış
 * SQL-dir və `drizzle-kit migrate` onları GÖRMÜR. Deploy də migration
 * işlətmir (bax `docs/DATA-PROTECTION.md`). Yəni «hansı migration tətbiq
 * olunub?» sualının cavabı yalnız burada yazılır.
 *
 * ⛔ `drizzle-kit migrate` İŞLƏDİLMİR. O, yalnız journal-dakı 8 migration-ı
 * bilir və qalan 18-i yox sayır. Tətbiq YALNIZ `npm run db:migrate` ilə edilir.
 *
 * Cədvəl `scripts/apply-migration.mjs` tərəfindən yaradılır və doldurulur;
 * burada TƏYİN edilir ki, kodda görünsün, Drizzle Studio-da açılsın və
 * `npm run db:status` onu tipli oxuya bilsin.
 */
export const schema_migrations_manual = pgTable('schema_migrations_manual', {
  filename:   text('filename').primaryKey(),
  applied_at: timestamp('applied_at').notNull().defaultNow(),
  statements: integer('statements'),
})
