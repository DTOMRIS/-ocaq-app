import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, sqlClient } from '@/db'
import { invitations, users } from '@/db/schema/auth'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { normalizeFilial } from '@/lib/analytics/filial-map'
import { createOneTimeToken, hashOneTimeToken } from '@/lib/one-time-token'
import { sendInvitationEmail } from '@/lib/email'

// Toplu dəvət — super_admin Excel atır (Shaurma email siyahısı). dryRun=true → yalnız
// eşleşme önizləməsi (heç bir e-poçt getmir). dryRun=false → dəvətlər yaradılır + e-poçt.
export const runtime = 'nodejs'
export const maxDuration = 60

type Row = { email: string; name: string; role: 'region_manager' | 'branch_manager'; target: string }

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'İcazəniz yoxdur' }, { status: 403 })

  const tenantId = session.user.tenant_id
  const body = await req.json().catch(() => ({})) as { invites?: Row[]; dryRun?: boolean }
  const invites = Array.isArray(body.invites) ? body.invites.filter(i => i?.email && i?.role && i?.target) : []
  if (!invites.length) return NextResponse.json({ error: 'Dəvət tapılmadı' }, { status: 400 })

  try {
  // Azerice harf-katlama (ı/i/İ/ə/ç/ş...) — "Bayil"↔"Bayıl", "İnşaatçilar"↔"İnşaatçılar" tutsun
  const canon = (s: string) => (normalizeFilial(s) ?? s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim()
  const brs = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(and(eq(branches.tenant_id, tenantId), eq(branches.is_active, true), eq(branches.is_archived, false)))
  const byBranch = new Map(brs.map(b => [canon(b.name), b.id]))
  const rgs = await db.select({ id: regions.id, name: regions.name }).from(regions).where(eq(regions.tenant_id, tenantId))

  const resolved = invites.map(inv => {
    const email = inv.email.trim().toLowerCase()
    let branchId: string | null = null, regionId: string | null = null
    if (inv.role === 'region_manager') {
      // Ad "İsmayıl bölgəsi" hedef "İsmayıl" → içerik-eşleştirme (bölgəsi eki tutmasın)
      const t = canon(inv.target)
      regionId = (rgs.find(r => canon(r.name) === t) ?? rgs.find(r => canon(r.name).includes(t)))?.id ?? null
    } else branchId = byBranch.get(canon(inv.target)) ?? null
    return { email, name: inv.name, role: inv.role, target: inv.target, branchId, regionId, matched: !!(branchId || regionId) }
  })
  const matched = resolved.filter(r => r.matched)
  const unmatched = resolved.filter(r => !r.matched).map(r => `${r.email} → ${r.target}`)

  // Önizləmə (dryRun) — heç bir e-poçt getmir
  if (body.dryRun) {
    return NextResponse.json({
      ok: true, dryRun: true, willSend: matched.length, unmatched,
      preview: matched.map(m => ({ email: m.email, role: m.role, target: m.target })),
      regionsInDb: rgs.map(r => r.name),   // DB-dəki bölgə adları (eşleşmə üçün)
      branchCount: brs.length,
    })
  }

  // Gerçək gönderim
  const BASE = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'https://ocaq.dkagency.com.tr'
  let sent = 0
  const skipped: string[] = []
  const failed: string[] = []
  const emailFailed: string[] = []
  const links: Array<{ email: string; target: string; url: string }> = []
  for (const m of matched) {
    const [u] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.tenant_id, tenantId), eq(users.email, m.email))).limit(1)
    if (u) { skipped.push(`${m.email} (hesab var)`); continue }
    // Köhnə pending dəvəti (qəbul olunmamış) sil → yenisini yarat ki hər dəfə təzə link olsun
    // (revoked_at 0005 prod-da olmaya bilər → filtrdə istifadə etmirik)
    const [p] = await db.select({ id: invitations.id }).from(invitations)
      .where(and(eq(invitations.tenant_id, tenantId), eq(invitations.email, m.email),
        isNull(invitations.accepted_at), gt(invitations.expires_at, new Date()))).limit(1)
    if (p) await sqlClient.query(`delete from invitations where id = $1`, [p.id]).catch(() => {})

    const token = createOneTimeToken()
    const tokenHash = hashOneTimeToken(token)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    try {
      // HAM SQL insert — yalnız orijinal kolonları yazır (drizzle-in insert-i 0005/0008
      // kolonlarını da 'default' ilə yazır → prod-da o kolonlar yoxdur → patlayır)
      const rows = await sqlClient.query(
        `insert into invitations (tenant_id, email, role, token, invited_by, region_id, branch_id, expires_at)
         values ($1, $2, $3::role, $4, $5, $6, $7, $8) returning id`,
        [tenantId, m.email, m.role, tokenHash, session.user.id, m.regionId, m.branchId, expiresAt],
      )
      // Davet linki — email getməsə də super_admin WhatsApp ilə göndərə bilsin (silmirik)
      links.push({ email: m.email, target: m.target, url: `${BASE}/accept-invite?token=${token}` })
      const branchName = m.branchId ? brs.find(b => b.id === m.branchId)?.name : undefined
      const { error } = await sendInvitationEmail({
        email: m.email, token, inviterName: session.user.name ?? 'Admin', recipientRole: m.role, branchName,
      })
      if (error) emailFailed.push(m.email)   // link qalır, silmirik
      else sent++
    } catch (e) { failed.push(`${m.email}: ${e instanceof Error ? e.message : String(e)}`) }
  }
  return NextResponse.json({ ok: true, sent, emailFailed, skipped, failed, unmatched, links }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Server xətası', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
