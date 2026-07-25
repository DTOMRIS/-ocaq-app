import {
  Html, Head, Body, Container, Section,
  Img, Text, Link, Preview,
} from '@react-email/components'
import * as React from 'react'

// ─── Rənglər — OCAQ brend paleti ─────────────────────────────────────────────
export const COLORS = {
  red:        '#C8102E',
  gold:       '#F2A81D',
  dark:       '#1A1614',
  white:      '#FFFFFF',
  bg:         '#F4F4F4',
  bodyText:   '#555555',
  muted:      '#999999',
  infoBg:     '#FFF8EC',
  infoBorder: '#F2A81D',
}

// Logo URL — production-da CDN, dev-da localhost
const LOGO_URL = `${process.env.NEXTAUTH_URL ?? 'https://ocaq.dkagency.com.tr'}/images/shaurma-logo.jpg`

interface LayoutProps {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: LayoutProps) {
  return (
    <Html lang="az" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{
        backgroundColor: COLORS.bg,
        margin: 0,
        padding: '32px 0',
        fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
      }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto' }}>

          {/* ─── Header ─────────────────────────────────────────── */}
          <Section style={{
            backgroundColor: COLORS.red,
            borderRadius: '8px 8px 0 0',
            padding: '28px 32px 20px',
            textAlign: 'center' as const,
          }}>
            {/* Logo dairəsi */}
            <table cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 10px' }}>
              <tbody>
                <tr>
                  <td style={{
                    width: '72px',
                    height: '72px',
                    backgroundColor: COLORS.white,
                    borderRadius: '50%',
                    border: `3px solid ${COLORS.gold}`,
                    textAlign: 'center' as const,
                    verticalAlign: 'middle',
                  }}>
                    <Img
                      src={LOGO_URL}
                      alt="OCAQ"
                      width={60}
                      height={60}
                      style={{ borderRadius: '50%', display: 'inline-block' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={{
              color: COLORS.white,
              fontSize: '20px',
              fontWeight: '700',
              margin: '0',
              letterSpacing: '0.5px',
            }}>
              OCAQ
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '10px',
              margin: '3px 0 0',
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
            }}>
              OCAQ · Operasiya Portalı
            </Text>
          </Section>

          {/* Qızılı xətt */}
          <div style={{ height: '4px', backgroundColor: COLORS.gold }} />

          {/* ─── Body ───────────────────────────────────────────── */}
          <Section style={{
            backgroundColor: COLORS.white,
            padding: '32px',
          }}>
            {children}
          </Section>

          {/* ─── Footer ─────────────────────────────────────────── */}
          <Section style={{
            backgroundColor: COLORS.dark,
            borderRadius: '0 0 8px 8px',
            padding: '20px 32px',
            textAlign: 'center' as const,
          }}>
            <Text style={{ color: '#888888', fontSize: '11px', margin: 0, lineHeight: '1.7' }}>
              <Link href="https://ocaq.app" style={{ color: COLORS.gold, textDecoration: 'none' }}>
                ocaq.app
              </Link>
              {' · '}
              <Link href="mailto:destek@ocaq.app" style={{ color: COLORS.gold, textDecoration: 'none' }}>
                Dəstək
              </Link>
              {' · OCAQ © '}
              {new Date().getFullYear()}
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ─── Paylaşılan stil köməkçiləri ─────────────────────────────────────────────
export const styles = {
  greeting: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#1a1a1a',
    margin: '0 0 12px',
  },

  bodyText: {
    fontSize: '14px',
    color: COLORS.bodyText,
    lineHeight: '1.7',
    margin: '0 0 20px',
  },

  button: (variant: 'red' | 'gold' = 'red') => ({
    display: 'block' as const,
    width: 'fit-content' as const,
    margin: '0 auto 24px',
    padding: '14px 36px',
    backgroundColor: variant === 'red' ? COLORS.red : COLORS.gold,
    color: variant === 'red' ? COLORS.white : COLORS.dark,
    fontSize: '15px',
    fontWeight: '700' as const,
    textDecoration: 'none' as const,
    borderRadius: '6px',
    letterSpacing: '0.3px',
    textAlign: 'center' as const,
  }),

  infoBox: {
    backgroundColor: COLORS.infoBg,
    borderLeft: `4px solid ${COLORS.gold}`,
    borderRadius: '0 6px 6px 0',
    padding: '14px 16px',
    marginBottom: '20px',
    fontSize: '13px',
    color: COLORS.bodyText,
    lineHeight: '1.6',
  },

  expireBadge: {
    display: 'inline-block' as const,
    backgroundColor: COLORS.infoBg,
    color: COLORS.red,
    fontSize: '12px',
    fontWeight: '600' as const,
    padding: '4px 12px',
    borderRadius: '20px',
    border: `1px solid ${COLORS.gold}`,
    marginBottom: '20px',
  },

  smallText: {
    fontSize: '12px',
    color: '#aaaaaa',
    textAlign: 'center' as const,
    margin: '0',
    lineHeight: '1.6',
  },

  iconCircle: (bgColor: string) => ({
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: bgColor,
    margin: '0 auto 16px',
    textAlign: 'center' as const,
    lineHeight: '56px',
    fontSize: '24px',
  }),
}
