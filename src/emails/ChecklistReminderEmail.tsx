import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles, COLORS } from './_components/EmailLayout'

interface ChecklistReminderEmailProps {
  branchName:    string  // "Nərimanov — Azadlıq pr. 158"
  checklistType: string  // "Günlük KXT (67 maddə)"
  deadline:      string  // "20 İyun 2026, 12:00"
  delayDuration: string  // "2 saat 18 dəqiqə"
  responsible:   string  // "Filial müdürü"
  ocaqUrl:       string
}

export function ChecklistReminderEmail({
  branchName, checklistType, deadline, delayDuration, responsible, ocaqUrl,
}: ChecklistReminderEmailProps) {

  const details: [string, string, boolean][] = [
    ['Filial',         branchName,    true],
    ['Yoxlama növü',   checklistType, false],
    ['Son tarix',      deadline,      false],
    ['Gecikən müddət', delayDuration, true],
    ['Cavabdeh',       responsible,   false],
  ]

  return (
    <EmailLayout preview={`⚠️ KXT yoxlaması gecikir — ${branchName}`}>

      <div style={styles.iconCircle('#fdecea')}>⚠️</div>

      <Text style={styles.greeting}>KXT yoxlaması gecikir</Text>

      <Text style={styles.bodyText}>
        Aşağıdakı filialda bu günkü KXT yoxlaması hələ tamamlanmayıb.
        Zəhmət olmasa müdiri ilə əlaqə saxlayın.
      </Text>

      {/* Detallar cədvəli */}
      <table cellPadding={0} cellSpacing={0} style={{
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: '13px',
        marginBottom: '20px',
      }}>
        <tbody>
          {details.map(([label, value, highlight]) => (
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
                color: highlight ? COLORS.red : '#1a1a1a',
                fontWeight: highlight ? '700' as const : '500' as const,
                fontSize: '13px',
              }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link href={ocaqUrl} style={styles.button('red')}>
        OCAQ-da yoxla →
      </Link>

      <div style={styles.infoBox}>
        Bu bildiriş <strong style={{ color: COLORS.red }}>avtomatik sistem</strong>{' '}
        tərəfindən göndərilmişdir. Yoxlama tamamlandıqda bildiriş dayanacaq.
      </div>

    </EmailLayout>
  )
}

ChecklistReminderEmail.PreviewProps = {
  branchName:    'Nərimanov — Azadlıq pr. 158',
  checklistType: 'Günlük KXT (67 maddə)',
  deadline:      '20 İyun 2026, 12:00',
  delayDuration: '2 saat 18 dəqiqə',
  responsible:   'Filial müdürü',
  ocaqUrl:       'https://ocaq.app/dashboard/vardiya-checklist',
} satisfies ChecklistReminderEmailProps

export default ChecklistReminderEmail
