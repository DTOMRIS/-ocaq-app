import { db } from './index'
import { tenants, users } from './schema/auth'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Seed başlayır...')

  // ─── 1. OCAQ tenant yarat ───────────────────────────────────────────────
  const [existingTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'ocaq'))
    .limit(1)

  let tenantId: string

  if (existingTenant) {
    console.log('✅ Tenant artıq mövcuddur:', existingTenant.id)
    tenantId = existingTenant.id
  } else {
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name: 'OCAQ',
        slug: 'ocaq',
      })
      .returning({ id: tenants.id })

    tenantId = newTenant.id
    console.log('✅ Tenant yaradıldı:', tenantId)
  }

  // ─── 2. Super admin yoxla / yarat ───────────────────────────────────────
  const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@ocaq.app'
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Ocaq2026!'
  const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     ?? 'Sistem Admini'

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1)

  if (existingUser) {
    console.log('⚠️  Admin artıq mövcuddur:', ADMIN_EMAIL)
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

    const [newUser] = await db
      .insert(users)
      .values({
        tenant_id:         tenantId,
        email:             ADMIN_EMAIL,
        name:              ADMIN_NAME,
        password_hash:     passwordHash,
        role:              'super_admin',
        is_active:         true,
        is_email_verified: true,
        email_verified_at: new Date(),
      })
      .returning({ id: users.id, email: users.email })

    console.log('✅ Super admin yaradıldı:')
    console.log('   E-poçt   :', newUser.email)
    console.log('   Şifrə    :', ADMIN_PASSWORD)
    console.log('   ⚠️  İlk girişdən sonra şifrəni dəyiş!')
  }

  console.log('\n🎉 Seed tamamlandı!')
  console.log('   → npm run dev')
  console.log('   → /login səhifəsini aç')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed xətası:', err)
  process.exit(1)
})
