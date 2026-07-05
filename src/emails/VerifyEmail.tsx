import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_components/EmailLayout'

interface VerifyEmailProps {
  name:      string  // "Könül Əliyeva"
  verifyUrl: string
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  const firstName = name.split(' ')[0]

  const steps = [
    'Aşağıdakı düyməyə basın',
    'E-poçt doğrulandıqdan sonra sisteminə daxil ola bilərsiniz',
    'İlk girişdə şifrənizi təyin edin',
  ]

  return (
    <EmailLayout preview="E-poçt adresinizi doğrulayın — OCAQ">

      <div style={styles.iconCircle('#e8f5e9')}>✅</div>

      <Text style={styles.greeting}>E-poçtunuzu doğrulayın</Text>

      <Text style={styles.bodyText}>
        Salam, <strong style={{ color: '#1a1a1a' }}>{firstName}</strong>. OCAQ
        hesabınız uğurla yaradıldı. Sistemi istifadə etmək üçün e-poçt
        adresinizi doğrulayın.
      </Text>

      {/* Addımlar */}
      <table cellPadding={0} cellSpacing={0} style={{ marginBottom: '20px', width: '100%' }}>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i}>
              <td style={{ width: '32px', verticalAlign: 'top', paddingBottom: '10px' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: '#C8102E',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '11px',
                  fontWeight: '700' as const,
                  textAlign: 'center' as const,
                  lineHeight: '22px',
                }}>
                  {i + 1}
                </div>
              </td>
              <td style={{
                fontSize: '13px',
                color: '#555',
                lineHeight: '1.6',
                paddingBottom: '10px',
                verticalAlign: 'top',
              }}>
                {step}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
        <span style={styles.expireBadge}>⏱ Bu link 24 saat etibarlıdır</span>
      </div>

      <Link href={verifyUrl} style={styles.button('gold')}>
        E-poçtu doğrula →
      </Link>

      <Text style={styles.smallText}>
        Bu məktubu siz almamısınızsa, laqeyd qalın.
      </Text>

    </EmailLayout>
  )
}

VerifyEmail.PreviewProps = {
  name:      'Könül Əliyeva',
  verifyUrl: 'https://ocaq.app/api/auth/verify-email?token=preview456',
} satisfies VerifyEmailProps

export default VerifyEmail
