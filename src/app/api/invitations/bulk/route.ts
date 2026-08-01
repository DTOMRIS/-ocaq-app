import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
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
  const body = await req.json() as { invites?: Row[]; dryRun?: boolean }
  const invites = Array.isArray(body.invites) ? body.invites.filter(i => i?.email && i?.role && i?.target) : []
  if (!invites.length) return NextResponse.json({ error: 'Dəvət tapılmadı' }, { status: 400 })

  // Azerice harf-katlama (ı/i/İ/ə/ç/ş...) — "Bayil"↔"Bayıl", "İnşaatçilar"↔"İnşaatçılar" tutsun
  const canon = (s: string) => (normalizeFilial(s) ?? s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim()
  const brs = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(and(eq(branches.tenant_id, tenantId), eq(branches.is_active, true), eq(branches.is_archived, false)))
  const byBranch = new Map(brs.map(b => [canon(b.name), b.id]))
  const rgs = await db.select({ id: regions.id, name: regions.name }).from(regions).where(eq(regions.tenant_id, tenantId))
  const byRegion = new Map(rgs.map(r => [r.name.trim().toLowerCase(), r.id]))

  const resolved = invites.map(inv => {
    const email = inv.email.trim().toLowerCase()
    let branchId: string | null = null, regionId: string | null = null
    if (inv.role === 'region_manager') regionId = byRegion.get(inv.target.trim().toLowerCase()) ?? null
    else branchId = byBranch.get(canon(inv.target)) ?? null
    return { email, name: inv.name, role: inv.role, target: inv.target, branchId, regionId, matched: !!(branchId || regionId) }
  })
  const matched = resolved.filter(r => r.matched)
  const unmatched = resolved.filter(r => !r.matched).map(r => `${r.email} → ${r.target}`)

  // Önizləmə (dryRun) — heç bir e-poçt getmir
  if (body.dryRun) {
    return NextResponse.json({
      ok: true, dryRun: true, willSend: matched.length, unmatched,
      preview: matched.map(m => ({ email: m.email, role: m.role, target: m.target })),
    })
  }

  // Gerçək gönderim
  let sent = 0
  const skipped: string[] = []
  const failed: string[] = []
  for (const m of matched) {
    const [u] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.tenant_id, tenantId), eq(users.email, m.email))).limit(1)
    if (u) { skipped.push(`${m.email} (hesab var)`); continue }
    const [p] = await db.select({ id: invitations.id }).from(invitations)
      .where(and(eq(invitations.tenant_id, tenantId), eq(invitations.email, m.email),
        isNull(invitations.accepted_at), isNull(invitations.revoked_at), gt(invitations.expires_at, new Date()))).limit(1)
    if (p) { skipped.push(`${m.email} (davet var)`); continue }

    const token = createOneTimeToken()
    const tokenHash = hashOneTimeToken(token)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    try {
      const [created] = await db.insert(invitations).values({
        tenant_id: tenantId, email: m.email, role: m.role, token: tokenHash,
        invited_by: session.user.id, region_id: m.regionId, branch_id: m.branchId, expires_at: expiresAt,
      }).returning({ id: invitations.id })
      const branchName = m.branchId ? brs.find(b => b.id === m.branchId)?.name : undefined
      const { error } = await sendInvitationEmail({
        email: m.email, token, inviterName: session.user.name ?? 'Admin', recipientRole: m.role, branchName,
      })
      if (error) {
        await db.update(invitations).set({ revoked_at: new Date(), revoked_by: session.user.id, revoked_reason: 'Dəvət e-poçtu göndərilə bilmədi' }).where(eq(invitations.id, created.id))
        failed.push(m.email); continue
      }
      sent++
    } catch { failed.push(`${m.email} (dublikat/xəta)`) }
  }
  return NextResponse.json({ ok: true, sent, skipped, failed, unmatched }, { status: 200 })
}
