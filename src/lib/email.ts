import nodemailer from 'nodemailer'
import { render } from '@react-email/render'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { VerifyEmail } from '@/emails/VerifyEmail'
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { ChecklistReminderEmail } from '@/emails/ChecklistReminderEmail'

const FROM   = process.env.SMTP_FROM ?? 'OCAQ <noreply@shaurma.az>'
const BASE   = process.env.NEXTAUTH_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

let smtpTransport: nodemailer.Transporter | null = null

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const port = Number(process.env.SMTP_PORT ?? 465)
  if (!host || !user || !pass || !Number.isInteger(port) || port <= 0) {
    throw new Error('DK SMTP xidməti tam qoşulmayıb')
  }

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  })
  return smtpTransport
}

async function deliverEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    const result = await getSmtpTransport().sendMail({ from: FROM, to, subject, html })
    return { data: { id: result.messageId }, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'DK SMTP göndəriş xətası',
    }
  }
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

  return deliverEmail({
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

  return deliverEmail({
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

  return deliverEmail({
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

  return deliverEmail({
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

  return deliverEmail({
    to: email,
    subject: `⚠️ KXT yoxlaması gecikir — ${branchName}`,
    html,
  })
}

// ─── Toplu mail (DK SMTP; kontrollü paralellik) ───────────────────────────────
export async function sendBulkEmail({
  emails, subject, html,
}: {
  emails: string[]
  subject: string
  html: string
}) {
  // DK serverini yükləməmək üçün eyni anda maksimum 5 məktub.
  for (let i = 0; i < emails.length; i += 5) {
    const results = await Promise.all(
      emails.slice(i, i + 5).map((email) => deliverEmail({
        to: email,
        subject,
        html,
      })),
    )
    const failed = results.find((result) => result.error)
    if (failed?.error) throw new Error(failed.error)
  }
}
