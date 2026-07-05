import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles, COLORS } from './_components/EmailLayout'

interface InvitationEmailProps {
  inviterName:   string   // "Əhməd Hüseynov"
  recipientRole: string   // "Filial Müdürü"
  branchName?:   string   // "Nərimanov — Azadlıq pr. 158"
  inviteUrl:     string   // "https://ocaq.app/accept-invite?token=xxx"
}

export function InvitationEmail({
  inviterName,
  recipientRole,
  branchName,
  inviteUrl,
}: InvitationEmailProps) {
  return (
    <EmailLayout preview={`${inviterName} sizi OCAQ-a dəvət edir`}>

      {/* İkon */}
      <div style={styles.iconCircle('#fff8ec')}>📨</div>

      <Text style={styles.greeting}>Sizi OCAQ-a dəvət edirik</Text>

      <Text style={styles.bodyText}>
        <strong style={{ color: '#1a1a1a' }}>{inviterName}</strong> sizi
        OCAQ Operasiya Portalına daxil olmağa dəvət edir. Aşağıdakı düyməyə
        basaraq hesabınızı aktivləşdirin.
      </Text>

      {/* Info qutusu */}
      <div style={styles.infoBox}>
        <strong style={{ color: COLORS.red }}>Sizin rolunuz:</strong> {recipientRole}
        {branchName && (
          <>
            <br />
            <strong style={{ color: COLORS.red }}>Filial:</strong> {branchName}
          </>
        )}
      </div>

      {/* Müddət */}
      <div style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
        <span style={styles.expireBadge}>⏱ Bu dəvət 48 saat etibarlıdır</span>
      </div>

      {/* CTA */}
      <Link href={inviteUrl} style={styles.button('red')}>
        Dəvəti qəbul et →
      </Link>

      {/* Fallback link */}
      <Text style={styles.smallText}>
        Düymə işləmirsə, bu linki kopyalayıb brauzerdə açın:
        <br />
        <span style={{ color: COLORS.red, wordBreak: 'break-all' as const }}>
          {inviteUrl}
        </span>
      </Text>

    </EmailLayout>
  )
}

InvitationEmail.PreviewProps = {
  inviterName:   'Əhməd Hüseynov',
  recipientRole: 'Filial Müdürü',
  branchName:    'Nərimanov — Azadlıq pr. 158',
  inviteUrl:     'https://ocaq.app/accept-invite?token=preview123',
} satisfies InvitationEmailProps

export default InvitationEmail
