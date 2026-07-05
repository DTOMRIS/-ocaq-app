import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles, COLORS } from './_components/EmailLayout'

interface WelcomeEmailProps {
  name: string
  role: string
  dashboardUrl: string
}

export function WelcomeEmail({ name, role, dashboardUrl }: WelcomeEmailProps) {
  const roleLabels: Record<string, string> = {
    super_admin:    'Süper Admin',
    region_manager: 'Bölgə Meneceri',
    branch_manager: 'Filial Meneceri',
    staff:          'Əməkdaş',
  }
  const roleLabel = roleLabels[role] ?? role

  const features = [
    { icon: '📋', text: 'Filial denetimləri və checklist-lər' },
    { icon: '👥', text: 'Personel idarəetməsi və vardiya planlaması' },
    { icon: '📊', text: 'KPI takibi və performans analitikası' },
    { icon: '🎯', text: 'Kampaniya idarəetməsi və simülasiyası' },
    { icon: '🤖', text: 'ML ilə stok tespiti (OOS)' },
  ]

  return (
    <EmailLayout preview={`Xoş gəldiniz, ${name}! OCAQ platformasına qoşuldunuz.`}>

      <div style={styles.iconCircle('#e8f5e9')}>🎉</div>

      <Text style={styles.greeting}>Xoş gəldiniz, {name}!</Text>

      <Text style={styles.bodyText}>
        OCAQ platforma ailənizə qoşulduğunuz üçün sizi təbrik edirik.
        Sizin rolunuz: <strong style={{ color: COLORS.red }}>{roleLabel}</strong>
      </Text>

      {/* Xüsusiyyətlər */}
      <div style={{
        backgroundColor: '#fafafa',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <Text style={{
          margin: '0 0 12px',
          fontWeight: '600' as const,
          color: '#1a1a1a',
          fontSize: '14px',
        }}>
          OCAQ ilə nə edə bilərsiniz:
        </Text>
        <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.text}>
                <td style={{ padding: '6px 0', fontSize: '14px', color: '#555' }}>
                  {feature.icon} {feature.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <Link href={dashboardUrl} style={styles.button('red')}>
        Dashboard-a keçin →
      </Link>

      {/* Məsləhət */}
      <div style={{
        ...styles.infoBox,
        backgroundColor: '#FFF8F0',
        borderLeftColor: '#F59E0B',
      }}>
        💡 <strong style={{ color: '#92400E' }}>Məsləhət:</strong> İlk olaraq
        profilinizi tamamlayın və bildirim ayarlarınızı yoxlayın.
      </div>

    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  name:         'Doğan Tomris',
  role:         'super_admin',
  dashboardUrl: 'https://ocaq.app/dashboard',
} satisfies WelcomeEmailProps

export default WelcomeEmail
