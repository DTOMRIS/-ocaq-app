import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { desc, eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { audit_logs, users } from '@/db/schema/auth'
import JurnalClient, { type Qeyd, type Istifadeci } from './jurnal-client'

export const metadata = { title: 'Jurnal — OCAQ' }
export const dynamic = 'force-dynamic'

/**
 * SİSTEM JURNALI.
 *
 * NİYƏ LAZIM OLDU: «filial və bölgə müdirləri sistemə girirmi?» sualının
 * cavabı heç bir ekranda yox idi. `audit_logs` cədvəli 28 növ hadisəni
 * yazırdı, `/api/audit-logs` ucu da vardı — amma HEÇ BİR SƏHİFƏ onu
 * göstərmirdi. Yəni sistem qeyd tuturdu, kimsə oxuya bilmirdi.
 *
 * Səhifə iki suala cavab verir:
 *   ① KİM NƏ VAXT GİRİB — istifadəçi siyahısı, son giriş, neçə gün əvvəl
 *   ② NƏ BAŞ VERİB — hadisə jurnalı, süzgəclərlə
 */
export default async function JurnalPage({ searchParams }: {
  searchParams: Promise<{ gun?: string; hadise?: string; kim?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') redirect('/dashboard')
  const tenantId = session.user.tenant_id
  const sp = await searchParams

  const gun = Math.min(Math.max(Number(sp?.gun ?? 30) || 30, 1), 365)
  // Aralıq SERVER vaxtından yox, BAZA vaxtından hesablanır: iki saat fərqli
  // olsa sərhəddəki qeydlər görünməzdi. (Həm də render içində `Date.now()`
  // çağırmaq React saflıq qaydasını pozur.)

  // ── ① Kim nə vaxt girib ──
  let istifadeciler: Istifadeci[] = []
  try {
    const rows = await db.select({
      id: users.id, ad: users.name, email: users.email, rol: users.role,
      aktiv: users.is_active, sonGiris: users.last_login_at, yaradilib: users.created_at,
    }).from(users).where(eq(users.tenant_id, tenantId))
    istifadeciler = rows
      .filter(r => r.rol !== 'staff')          // işçi OCAQ-a girmir, siyahını şişirdir
      .map(r => ({
        id: r.id, ad: r.ad, email: r.email, rol: r.rol, aktiv: r.aktiv,
        sonGiris: r.sonGiris ? r.sonGiris.toISOString() : null,
        yaradilib: r.yaradilib.toISOString(),
      }))
      .sort((a, b) => (b.sonGiris ?? '').localeCompare(a.sonGiris ?? ''))
  } catch (e) {
    console.error('[jurnal] istifadəçi siyahısı oxunmadı:', e)
  }

  // ── ② Hadisə jurnalı ──
  let qeydler: Qeyd[] = []
  try {
    const rows = await db.select({
      id: audit_logs.id, action: audit_logs.action, entity: audit_logs.entity,
      metadata: audit_logs.metadata, ip: audit_logs.ip,
      created_at: audit_logs.created_at, user_id: audit_logs.user_id,
    }).from(audit_logs)
      .where(and(eq(audit_logs.tenant_id, tenantId),
                 sql`${audit_logs.created_at} >= now() - make_interval(days => ${gun})`))
      .orderBy(desc(audit_logs.created_at))
      .limit(500)
    const adMap = new Map(istifadeciler.map(u => [u.id, u.ad || u.email]))
    qeydler = rows.map(r => ({
      id: r.id, action: r.action, entity: r.entity,
      metadata: r.metadata, ip: r.ip,
      tarix: r.created_at.toISOString(),
      kim: r.user_id ? (adMap.get(r.user_id) ?? '—') : 'sistem',
    }))
  } catch (e) {
    console.error('[jurnal] hadisələr oxunmadı:', e)
  }

  return <JurnalClient istifadeciler={istifadeciler} qeydler={qeydler}
                       gun={gun} hadise={sp?.hadise ?? ''} kim={sp?.kim ?? ''} />
}
