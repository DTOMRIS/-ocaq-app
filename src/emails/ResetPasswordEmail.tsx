import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles, COLORS } from './_components/EmailLayout'

interface ResetPasswordEmailProps {
  resetUrl:    string
  requestedAt: string  // "20 İyun 2026, 14:32"
  ipAddress:   string  // "185.xx.xx.xx (Bakı)"
  device:      string  // "Chrome / Windows"
}

export function ResetPasswordEmail({
  resetUrl, requestedAt, ipAddress, device,
}: ResetPasswordEmailProps) {

  const details = [
    ['Sorğu vaxtı', requestedAt],
    ['IP ünvanı',   ipAddress],
    ['Cihaz',       device],
  ]

  return (
    <EmailLayout preview="Şifrə sıfırlama sorğusu — OCAQ">

      <div style={styles.iconCircle('#fdecea')}>🔒</div>

      <Text style={styles.greeting}>Şifrə sıfırlama sorğusu</Text>

      <Text style={styles.bodyText}>
        OCAQ hesabınız üçün şifrə sıfırlama sorğusu alındı. Bu sorğu siz
        tərəfindən göndərilməyibsə, bu məktubu laqeyd qalın.
      </Text>

      {/* Detallar cədvəli */}
      <table cellPadding={0} cellSpacing={0} style={{
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: '13px',
        marginBottom: '20px',
      }}>
        <tbody>
          {details.map(([label, value]) => (
            <tr key={label}>
              <td style={{
                padding: '9px 0',
                borderBottom: '1px solid #f0f0f0',
                color: '#888',
                width: '42%',
              }}>
                {label}
              </td>
              <td style={{
                padding: '9px 0',
                borderBottom: '1px solid #f0f0f0',
                color: '#1a1a1a',
                fontWeight: '500' as const,
              }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
        <span style={styles.expireBadge}>⏱ Bu link 1 saat etibarlıdır</span>
      </div>

      <Link href={resetUrl} style={styles.button('red')}>
        Şifrəni sıfırla →
      </Link>

      <div style={{ ...styles.infoBox, marginTop: '8px' }}>
        ⚠️ <strong style={{ color: COLORS.red }}>Diqqət:</strong> Bu sorğu siz
        göndərməmisinizsə, hesabınızın təhlükəsizliyi üçün dərhal{' '}
        <Link href="mailto:destek@ocaq.app" style={{ color: COLORS.red, textDecoration: 'underline' }}>
          dəstəklə
        </Link>{' '}
        əlaqə saxlayın.
      </div>

    </EmailLayout>
  )
}

ResetPasswordEmail.PreviewProps = {
  resetUrl:    'https://ocaq.app/reset-password?token=preview789',
  requestedAt: '20 İyun 2026, 14:32',
  ipAddress:   '185.xx.xx.xx (Bakı)',
  device:      'Chrome / Windows',
} satisfies ResetPasswordEmailProps

export default ResetPasswordEmail
