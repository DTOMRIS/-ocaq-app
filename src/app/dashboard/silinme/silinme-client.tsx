'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

/**
 * SİLİNMƏ NƏZARƏTİ ekranı.
 *
 * 🔴 İKİ RƏQƏM, HƏMİŞƏ YAN-YANA: «xam» və «anomaliyasız».
 * 22.08.2026-da Amay-ın xam silinmə nisbəti %76,38 çıxmışdı və bu, filiala
 * haqsız şübhə yaradırdı — səbəb 2 səhv giriş idi (PİZZA SALAMİ 1 ədəd =
 * 20 079,90 ₼). Anomaliyasız nisbət %1,95. Ona görə ekran heç vaxt tək
 * rəqəm göstərmir: qərar «anomaliyasız» sütununa görə verilir, xam rəqəm
 * isə gizlədilmir.
 */

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const money = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₼'
const money2 = (v: number) => v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₼'
const int = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ')
const th: CSSProperties = { padding: '7px 9px', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .3, color: '#8b8378' }
const td: CSSProperties = { padding: '8px 9px', fontVariantNumeric: 'tabular-nums' }

type Branch = {
  filial: string; total: number; clean: number; outlier: number
  cnt: number; offCnt: number; noComment: number; revenue: number
}
type Reason = { reason: string; amount: number; cnt: number }
type Day = { date: string; clean: number; total: number; cnt: number }
type Outlier = { date: string; filial: string; item: string; receipt: string; comment: string; amount: number }
type Item = { item: string; amount: number; cnt: number }

/** Nisbətə görə rəng: %2-dən aşağı normal, %2–4 diqqət, %4+ araşdır. */
function tone(pct: number | null) {
  if (pct == null) return { c: '#8b8378', bg: '#faf8f4' }
  if (pct >= 0.04) return { c: '#8a1f2a', bg: '#fdf0f1' }
  if (pct >= 0.02) return { c: '#6b4e12', bg: '#fdf6e9' }
  return { c: '#1f5130', bg: '#f1f8f2' }
}

export default function SilinmeClient(props: {
  empty?: string
  start?: string; end?: string; outlierMin?: number
  byBranch?: Branch[]; byReason?: Reason[]; byDay?: Day[]
  outliers?: Outlier[]; byItem?: Item[]
}) {
  if (props.empty) {
    return (
      <div style={{ padding: 20, maxWidth: 900 }}>
        <Head />
        <div style={{ ...card, padding: '44px 24px', textAlign: 'center', color: '#8b8378', fontSize: 13.5, lineHeight: 1.7 }}>
          {props.empty}
          <div style={{ marginTop: 14 }}>
            <Link href="/dashboard/panel" style={{ color: '#C8102E', fontWeight: 700, fontSize: 13 }}>Günlük Panelə keç →</Link>
          </div>
        </div>
      </div>
    )
  }

  const b = props.byBranch ?? []
  const days = props.byDay ?? []
  const outliers = props.outliers ?? []
  const totClean = b.reduce((s, x) => s + x.clean, 0)
  const totOut = b.reduce((s, x) => s + x.outlier, 0)
  const totRev = b.reduce((s, x) => s + x.revenue, 0)
  const totCnt = b.reduce((s, x) => s + x.cnt, 0)
  const totNoComment = b.reduce((s, x) => s + x.noComment, 0)
  const netPct = totRev > 0 ? totClean / totRev : null
  const maxDay = Math.max(...days.map(d => d.clean), 1)

  return (
    <div style={{ padding: 20, maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Head sub={`${props.start} → ${props.end}`} />

      {/* ── Özet ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
        <Stat k="Silinmə (anomaliyasız)" v={money(totClean)}
          sub={netPct != null ? `ciroya nisbət %${(netPct * 100).toFixed(2)}` : undefined}
          tone={tone(netPct).c} />
        <Stat k="Anomaliya (səhv giriş?)" v={money(totOut)}
          sub={`tək silinmə ≥ ${props.outlierMin} ₼ · ${outliers.length} sətir`} />
        <Stat k="Silinmə sayı" v={int(totCnt)} />
        <Stat k="Şərhsiz silinmə" v={totCnt ? `%${(totNoComment / totCnt * 100).toFixed(0)}` : '—'}
          sub={`${int(totNoComment)} sətir · nəzarət boşluğu`} />
        <Stat k="Ciro (eyni dövr)" v={money(totRev)} />
      </div>

      <div style={{ background: '#f7f6f3', border: '1px solid #e6e1d7', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#4d483f', lineHeight: 1.65 }}>
        <b>Qərar «anomaliyasız» sütununa görə verilir.</b> Tək silinmə {props.outlierMin} ₼-dən böyükdürsə
        ayrıca sayılır — real hadisə: bir filialın xam nisbəti %76,38 çıxmışdı, səbəb 2 səhv giriş idi
        (bir məhsul 20 079,90 ₼ yazılmışdı); anomaliyasız nisbət %1,95 idi. Xam rəqəm gizlədilmir,
        lakin ittiham ona görə qurulmur.
      </div>

      {/* ── Filial cədvəli ───────────────────────────────────────────────── */}
      <Section title="Filiallar" note="anomaliyasız nisbətə görə sıralanıb · %2-yə qədər normal, %4+ araşdırılmalı">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e6e1d7' }}>
                <th style={th}>Filial</th>
                <th style={{ ...th, textAlign: 'right' }}>Nisbət</th>
                <th style={{ ...th, textAlign: 'right' }}>Silinmə</th>
                <th style={{ ...th, textAlign: 'right' }}>Anomaliya</th>
                <th style={{ ...th, textAlign: 'right' }}>Say</th>
                <th style={{ ...th, textAlign: 'right' }}>Anbardan</th>
                <th style={{ ...th, textAlign: 'right' }}>Şərhsiz</th>
                <th style={{ ...th, textAlign: 'right' }}>Ciro</th>
              </tr>
            </thead>
            <tbody>
              {b.map(x => {
                const pct = x.revenue > 0 ? x.clean / x.revenue : null
                const t = tone(pct)
                return (
                  <tr key={x.filial} style={{ borderTop: '1px solid #f0ece4' }}>
                    <td style={{ ...td, fontWeight: 600 }}>{x.filial}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <span style={{ background: t.bg, color: t.c, border: `1px solid ${t.c}33`, borderRadius: 7, padding: '2px 8px', fontWeight: 800 }}>
                        {pct != null ? `%${(pct * 100).toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money2(x.clean)}</td>
                    <td style={{ ...td, textAlign: 'right', color: x.outlier > 0 ? '#8a6a1f' : '#c8c2b6' }}>
                      {x.outlier > 0 ? money(x.outlier) : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(x.cnt)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#6b655c' }} title="anbardan da silinib = real itki">
                      {int(x.offCnt)}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: x.cnt && x.noComment / x.cnt > 0.5 ? '#8a6a1f' : '#6b655c' }}>
                      {x.cnt ? `%${(x.noComment / x.cnt * 100).toFixed(0)}` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{money(x.revenue)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Gün trendi ───────────────────────────────────────────────────── */}
      {days.length > 1 && (
        <Section title="Gün-gün" note="anomaliyasız silinmə məbləği">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', minWidth: Math.max(420, days.length * 26), height: 120 }}>
              {days.map(d => (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                  title={`${d.date} · ${money2(d.clean)} · ${d.cnt} sətir`}>
                  <div style={{
                    width: '100%', height: `${Math.max(2, d.clean / maxDay * 95)}px`, borderRadius: '3px 3px 0 0',
                    background: d.clean === maxDay ? '#C8102E' : '#26221d',
                  }} />
                  <div style={{ fontSize: 9, color: '#6b655c' }}>{d.date.slice(8)}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Anomaliyalar ─────────────────────────────────────────────────── */}
      {outliers.length > 0 && (
        <Section title="Anomaliyalar — səhv giriş ehtimalı"
          note={`tək silinmə ≥ ${props.outlierMin} ₼ · bunlar oğurluq deyil, DÜZƏLİŞ tələb edən girişlərdir`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e6e1d7' }}>
                  <th style={th}>Gün</th><th style={th}>Filial</th><th style={th}>Məhsul</th>
                  <th style={th}>Qəbz</th><th style={th}>Şərh</th>
                  <th style={{ ...th, textAlign: 'right' }}>Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {outliers.map((o, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0ece4' }}>
                    <td style={td}>{o.date}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{o.filial}</td>
                    <td style={td}>{o.item}</td>
                    <td style={{ ...td, color: '#8b8378' }}>{o.receipt || '—'}</td>
                    <td style={{ ...td, color: o.comment ? '#4d483f' : '#c8c2b6' }}>{o.comment || 'şərh yoxdur'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: '#8a1f2a' }}>{money2(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Səbəb + ən çox silinən ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <Section title="Səbəb" note="anbardan silinib = real itki">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              {(props.byReason ?? []).map(r => (
                <tr key={r.reason} style={{ borderTop: '1px solid #f0ece4' }}>
                  <td style={td}>{r.reason}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(r.cnt)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Ən çox silinən məhsullar" note="anomaliyasız · sayına görə">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              {(props.byItem ?? []).map(i => (
                <tr key={i.item} style={{ borderTop: '1px solid #f0ece4' }}>
                  <td style={td}>{i.item}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(i.cnt)} dəfə</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  )
}

function Head({ sub }: { sub?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🗑 Silinmə Nəzarəti</h1>
      <div style={{ color: '#8b8378', fontSize: 12.5, marginTop: 4 }}>
        iiko «Silinme hesabati»ndan · ləğv edilən sətirlər {sub ? `· ${sub}` : ''}
      </div>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
        {note && <div style={{ fontSize: 11.5, color: '#8b8378', marginTop: 2 }}>{note}</div>}
      </div>
      {children}
    </div>
  )
}

function Stat({ k, v, sub, tone: t }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div style={{ background: '#faf8f4', border: '1px solid #eee9e0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .3 }}>{k}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2, color: t ?? '#26221d' }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#8b8378', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
