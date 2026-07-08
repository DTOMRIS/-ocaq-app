import { db } from './index'
import { tenants, users } from './schema/auth'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

/**
 * Super admin-i GARANTİ yaradır / bərpa edir.
 *
 * seed.ts-dən fərqi: admin artıq mövcuddursa BELƏ şifrəni, aktivliyi və
 * e-poçt təsdiqini məcburi yeniləyir. "Yanlış şifrə" problemini birdəfəlik
 * həll etmək üçün prod DB-yə qarşı işlədilir.
 *
 *   DATABASE_URL="<prod>" npm run db:reset-admin
 *
 * İstəyə görə: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 */
async function resetAdmin() {
  const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@ocaq.app'
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Ocaq2026!'
  const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     ?? 'Sistem Admini'

  console.log('🔐 Admin bərpası başlayır...')
  console.log('   E-poçt:', ADMIN_EMAIL)

  // ─── 1. OCAQ tenant təmin et ───────────────────────────────────────────
  let [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'ocaq'))
    .limit(1)

  if (!tenant) {
    ;[tenant] = await db
      .insert(tenants)
      .values({ name: 'OCAQ', slug: 'ocaq' })
      .returning()
    console.log('✅ Tenant yaradıldı:', tenant.id)
  } else {
    console.log('✅ Tenant mövcuddur:', tenant.id)
  }

  // ─── 2. Şifrəni hash-lə ────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  // ─── 3. Admin varsa YENİLƏ, yoxdursa YARAT ─────────────────────────────
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1)

  if (existing) {
    await db
      .update(users)
      .set({
        password_hash:     passwordHash,
        role:              'super_admin',
        is_active:         true,
        is_email_verified: true,
        email_verified_at: new Date(),
        updated_at:        new Date(),
      })
      .where(eq(users.id, existing.id))
    console.log('♻️  Mövcud admin bərpa edildi (şifrə + aktivlik + təsdiq yeniləndi).')
  } else {
    await db.insert(users).values({
      tenant_id:         tenant.id,
      email:             ADMIN_EMAIL,
      name:              ADMIN_NAME,
      password_hash:     passwordHash,
      role:              'super_admin',
      is_active:         true,
      is_email_verified: true,
      email_verified_at: new Date(),
    })
    console.log('✅ Yeni super admin yaradıldı.')
  }

  console.log('\n🎉 Hazırdır! İndi giriş edə bilərsən:')
  console.log('   E-poçt :', ADMIN_EMAIL)
  console.log('   Şifrə  :', ADMIN_PASSWORD)
  process.exit(0)
}

resetAdmin().catch((err) => {
  console.error('❌ Bərpa xətası:', err)
  process.exit(1)
})
