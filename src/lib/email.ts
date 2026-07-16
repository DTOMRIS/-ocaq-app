import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { VerifyEmail } from '@/emails/VerifyEmail'
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { ChecklistReminderEmail } from '@/emails/ChecklistReminderEmail'

const FROM   = process.env.SENDER_EMAIL ?? 'OCAQ <noreply@ocaq.app>'
const BASE   = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('E-poçt xidməti qoşulmayıb')
  return new Resend(apiKey)
}

// ─── Hoş Gəldiniz maili ──────────────────────────────────────────────────────
export async function sendWelcomeEmail({
  email, name, role,
}: { email: string; name: string; role: string }) {
  const html = await render(
    WelcomeEmail({
      name,
      role,
      dashboardUrl: `${BASE}/dashboard`,
    })
  )

  return getResend().emails.send({
    from: FROM,
    to: email,
    subject: `🔥 OCAQ-a xoş gəldiniz, ${name}!`,
    html,
  })
}

// ─── Dəvət maili ──────────────────────────────────────────────────────────────
export async function sendInvitationEmail({
  email, token, inviterName, recipientRole, branchName,
}: {
  email: string
  token: string
  inviterName: string
  recipientRole?: string
  branchName?: string
}) {
  const inviteUrl = `${BASE}/accept-invite?token=${token}`

  const roleLabels: Record<string, string> = {
    super_admin:    'Süper Admin',
    region_manager: 'Bölgə Meneceri',
    branch_manager: 'Filial Meneceri',
    staff:          'Əməkdaş',
  }

  const html = await render(
    InvitationEmail({
      inviterName,
      recipientRole: roleLabels[recipientRole ?? 'staff'] ?? recipientRole ?? 'Əməkdaş',
      branchName,
      inviteUrl,
    })
  )

  return getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${inviterName} sizi OCAQ-a dəvət edir`,
    html,
  })
}

// ─── E-poçt doğrulama maili ──────────────────────────────────────────────────
export async function sendVerificationEmail({
  email, token, name,
}: { email: string; token: string; name: string }) {
  const verifyUrl = `${BASE}/api/auth/verify-email?token=${token}`

  const html = await render(
    VerifyEmail({ name, verifyUrl })
  )

  return getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'OCAQ — E-poçt adresinizi doğrulayın',
    html,
  })
}

// ─── Şifrə sıfırlama maili ───────────────────────────────────────────────────
export async function sendPasswordResetEmail({
  email, token, ip, device,
}: {
  email: string
  token: string
  ip?: string
  device?: string
}) {
  const resetUrl = `${BASE}/reset-password?token=${token}`

  const html = await render(
    ResetPasswordEmail({
      resetUrl,
      requestedAt: new Date().toLocaleString('az-AZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ipAddress: ip ?? 'Bilinmir',
      device: device ?? 'Bilinmir',
    })
  )

  return getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'OCAQ — Şifrə sıfırlama',
    html,
  })
}

// ─── KXT gecikməsi bildirişi ─────────────────────────────────────────────────
export async function sendChecklistReminderEmail({
  email, branchName, checklistType, deadline, delayDuration, responsible,
}: {
  email: string
  branchName: string
  checklistType: string
  deadline: string
  delayDuration: string
  responsible: string
}) {
  const html = await render(
    ChecklistReminderEmail({
      branchName,
      checklistType,
      deadline,
      delayDuration,
      responsible,
      ocaqUrl: `${BASE}/dashboard/vardiya-checklist`,
    })
  )

  return getResend().emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ KXT yoxlaması gecikir — ${branchName}`,
    html,
  })
}

// ─── Toplu mail (Resend Batch API) ───────────────────────────────────────────
export async function sendBulkEmail({
  emails, subject, html,
}: {
  emails: string[]
  subject: string
  html: string
}) {
  // Resend batch max 100 per request
  const chunks: string[][] = []
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    await getResend().batch.send(
      chunk.map((email) => ({
        from: FROM,
        to: email,
        subject,
        html,
      }))
    )
  }
}
