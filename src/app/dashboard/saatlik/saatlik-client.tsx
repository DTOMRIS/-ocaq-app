'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'

/**
 * SAATLIQ SATIŞ ekranı.
 *
 * İKİ BÖLMƏ, QARIŞDIRILMIR:
 *   1. «Dövr profili» — yüklənən faylın özü (kumulyativ). BİRİNCİ fayldan
 *      etibarən dolu olur.
 *   2. «Gün-gün» — iki ardıcıl faylın fərqi. İKİNCİ fayldan etibarən dolur.
 * Hansının nə olduğu başlıqda yazılır ki «niyə burada rəqəm var, orada yox»
 * sualı yaranmasın.
 *
 * Rəqəm formatı: `az-AZ` minlik ayırıcı olaraq NÖQTƏ işlədir → «129.193 ₼»
 * 129 manat kimi oxunur. Ona görə boşluqla ayırırıq (bax `dashboard/page.tsx`).
 */

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const money = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₼'
const int = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ')
const hh = (h: number) => String(h).padStart(2, '0') + ':00'

type Snapshot = { start: string; end: string; net: number; guests: number; branches: number; rows: number }
type HourRow = { hour: number; net: number; guests: number }
type PayRow = { payType: string; net: number; guests: number }
type BranchRow = { filial: string; net: number; guests: number; peak: number }
type DayRow = { date: string; net: number; guests: number; derivation: string }

export default function SaatlikClient(props: {
  empty?: string
  /** 'fact' = gün-gün data (əsas) · 'cume' = köhnə kumulyativ görüntü. */
  source?: 'fact' | 'cume'
  snapshots: Snapshot[]
  latest?: Snapshot
  filials: string[]
  drillFilial?: string | null
  cumeHours?: HourRow[]
  cumePay?: PayRow[]
  cumeBranch?: BranchRow[]
  days: DayRow[]
  pickedDay?: string | null
  dayHours?: HourRow[]
  canDrill?: boolean
}) {
  const router = useRouter()

  // URL `useSearchParams` ilə deyil, SERVERDƏN gələn props-dan qurulur.
  // Səbəb: `useSearchParams` prerender zamanı Suspense sərhədi tələb edir və
  // build-i sındıra bilər. Mövcud vəziyyət onsuz da props-dadır.
  function setParam(key: 'filial' | 'gun', value: string | null) {
    const q = new URLSearchParams()
    const next = { filial: props.drillFilial ?? null, gun: props.pickedDay ?? null, [key]: value }
    if (next.filial) q.set('filial', next.filial)
    if (next.gun) q.set('gun', next.gun)
    router.push(`/dashboard/saatlik${q.toString() ? `?${q}` : ''}`)
  }

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

  const latest = props.latest!
  const cumeHours = props.cumeHours ?? []
  const cumePay = props.cumePay ?? []
  const cumeBranch = props.cumeBranch ?? []
  const dayHours = props.dayHours ?? []

  const cumeNet = cumeHours.reduce((s, h) => s + h.net, 0)
  const cumeGuests = cumeHours.reduce((s, h) => s + h.guests, 0)
  const peak = [...cumeHours].sort((a, b) => b.net - a.net)[0] ?? null
  const quiet = [...cumeHours].filter(h => h.net > 0).sort((a, b) => a.net - b.net)[0] ?? null
  const payTotal = cumePay.reduce((s, p) => s + p.net, 0)
  const dayNet = dayHours.reduce((s, h) => s + h.net, 0)

  return (
    <div style={{ padding: 20, maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Head />

      {/* ── Əhatə seçimi ─────────────────────────────────────────────────── */}
      {props.canDrill && (
        <div style={{ ...card, padding: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6b655c' }}>Filial:</span>
          <select value={props.drillFilial ?? ''} onChange={e => setParam('filial', e.target.value || null)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d8d2c6', fontSize: 13 }}>
            <option value="">Bütün şəbəkə ({props.filials.length} filial)</option>
            {props.filials.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {props.drillFilial && (
            <button onClick={() => setParam('filial', null)} style={{ fontSize: 12, background: 'none', border: 'none', color: '#8b8378', cursor: 'pointer', textDecoration: 'underline' }}>
              şəbəkəyə qayıt
            </button>
          )}
        </div>
      )}

      {/* ── 1. DÖVR PROFİLİ (kumulyativ fayl) ────────────────────────────── */}
      {/* Mənbə ekranda AÇIQ yazılır — «niyə rəqəm dəyişmədi» sualı yaranmasın. */}
      {props.source === 'cume' && (
        <div style={{ background: '#fdf6e9', border: '1px solid #eddcb6', color: '#6b4e12', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6 }}>
          <b>Köhnə kumulyativ görüntü göstərilir</b> ({latest.start} → {latest.end}) — bu faylda gün sütunu yoxdu.
          {' '}Gün-gün data üçün «Satış ay və gün» hesabatını yükləyin: onda bu ekran avtomatik ona keçir.
          {' '}<Link href="/dashboard/panel" style={{ color: '#8a1f2a', fontWeight: 700 }}>Günlük Panelə keç →</Link>
        </div>
      )}

      <Section
        title="Dövr profili"
        note={props.source === 'fact'
          ? `${latest.start} → ${latest.end} · gün-gün data (${props.days.length} gün)`
          : `${latest.start} → ${latest.end} · köhnə kumulyativ görüntü`}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>
          <Stat k="Ciro" v={money(cumeNet)} />
          <Stat k="Qonaq" v={int(cumeGuests)} sub={cumeGuests > 0 ? `${(cumeNet / cumeGuests).toFixed(2)} ₼/qonaq` : undefined} />
          <Stat k="Pik saat" v={peak ? hh(peak.hour) : '—'} sub={peak ? `${money(peak.net)} · %${(peak.net / cumeNet * 100).toFixed(1)}` : undefined} />
          <Stat k="Ən sakit saat" v={quiet ? hh(quiet.hour) : '—'} sub={quiet ? `${money(quiet.net)} · %${(quiet.net / cumeNet * 100).toFixed(1)}` : undefined} />
          <Stat k="Filial" v={int(props.drillFilial ? 1 : cumeBranch.length)} />
        </div>

        <HourBars rows={cumeHours} total={cumeNet} />
      </Section>

      {/* ── Ödəniş qarışığı ──────────────────────────────────────────────── */}
      <Section title="Ödəniş növü" note="eyni dövr üzrə">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#8b8378', fontSize: 11, textTransform: 'uppercase' }}>
              <th style={th}>Növ</th><th style={{ ...th, textAlign: 'right' }}>Ciro</th>
              <th style={{ ...th, textAlign: 'right' }}>Pay</th><th style={{ ...th, textAlign: 'right' }}>Qonaq</th>
            </tr>
          </thead>
          <tbody>
            {cumePay.map(p => (
              <tr key={p.payType} style={{ borderTop: '1px solid #f0ece4' }}>
                <td style={td}>{p.payType}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(p.net)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>%{payTotal > 0 ? (p.net / payTotal * 100).toFixed(2) : '0.00'}</td>
                <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(p.guests)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Filial cədvəli ───────────────────────────────────────────────── */}
      {!props.drillFilial && cumeBranch.length > 1 && (
        <Section title="Filiallar" note="pik saat = həmin filialın ən güclü saatı">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#8b8378', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={th}>Filial</th><th style={{ ...th, textAlign: 'right' }}>Ciro</th>
                <th style={{ ...th, textAlign: 'right' }}>Qonaq</th>
                <th style={{ ...th, textAlign: 'right' }}>₼/qonaq</th>
                <th style={{ ...th, textAlign: 'right' }}>Pik saat</th>
              </tr>
            </thead>
            <tbody>
              {cumeBranch.map(b => (
                <tr key={b.filial} style={{ borderTop: '1px solid #f0ece4', cursor: 'pointer' }}
                  onClick={() => setParam('filial', b.filial)}>
                  <td style={{ ...td, fontWeight: 600 }}>{b.filial}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(b.net)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(b.guests)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{b.guests > 0 ? (b.net / b.guests).toFixed(2) : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{hh(b.peak)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── 2. GÜN-GÜN (fərqdən) ─────────────────────────────────────────── */}
      <Section
        title="Gün-gün"
        note="iki ardıcıl faylın fərqindən çıxarılır — İKİNCİ fayldan etibarən dolur"
      >
        {props.days.length === 0 ? (
          <div style={{ background: '#fdf6e9', border: '1px solid #eddcb6', color: '#6b4e12', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.7 }}>
            Hələ gün-gün data yoxdur. <b>«Satış ay və gün»</b> hesabatını yükləyin — həmin faylda
            <b> «Uçot günü»</b> sütunu var və sətirlər birbaşa öz gününə yazılır.
            <div style={{ marginTop: 8 }}>
              Gün sütunu olmayan fayl yüklənibsə (köhnə format) sistem gün uydurmur — iki ardıcıl
              faylın fərqini gözləyir.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {props.days.map(d => (
                <button key={d.date} onClick={() => setParam('gun', props.pickedDay === d.date ? null : d.date)}
                  style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${props.pickedDay === d.date ? '#C8102E' : '#e6e1d7'}`,
                    background: props.pickedDay === d.date ? '#fdf0f1' : '#faf8f4',
                    fontWeight: props.pickedDay === d.date ? 800 : 600,
                  }}>
                  <div>{d.date}</div>
                  <div style={{ color: '#6b655c', marginTop: 2 }}>{money(d.net)}</div>
                </button>
              ))}
            </div>
            {props.pickedDay && dayHours.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, margin: '6px 0 10px' }}>
                  {props.pickedDay} — saat profili · {money(dayNet)}
                </div>
                <HourBars rows={dayHours} total={dayNet} />
              </>
            )}
            {!props.pickedDay && (
              <div style={{ fontSize: 12, color: '#8b8378' }}>Saat profilini görmək üçün günə toxunun.</div>
            )}
          </>
        )}
      </Section>

      {/* ── Yüklənmiş görüntülər ─────────────────────────────────────────── */}
      {props.snapshots.length > 0 && (
      <Section title="Köhnə kumulyativ görüntülər (arxiv)" note="gün sütunu olmayan fayllardan qalıb; əsas data yuxarıdadır">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#8b8378', fontSize: 11, textTransform: 'uppercase' }}>
              <th style={th}>Dövr</th><th style={{ ...th, textAlign: 'right' }}>Ciro</th>
              <th style={{ ...th, textAlign: 'right' }}>Qonaq</th>
              <th style={{ ...th, textAlign: 'right' }}>Filial</th>
              <th style={{ ...th, textAlign: 'right' }}>Sətir</th>
            </tr>
          </thead>
          <tbody>
            {props.snapshots.map(sn => (
              <tr key={`${sn.start}|${sn.end}`} style={{ borderTop: '1px solid #f0ece4', background: sn.end === latest.end ? '#faf8f4' : undefined }}>
                <td style={td}>{sn.start} → <b>{sn.end}</b>{sn.end === latest.end ? ' · ən son' : ''}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(sn.net)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(sn.guests)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(sn.branches)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#6b655c' }}>{int(sn.rows)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      )}

      <div style={{ fontSize: 11.5, color: '#8b8378', lineHeight: 1.7 }}>
        <b>Qeyd:</b> «Qonaq» çek sayı DEYİL — bir qəbz iki saata/ödəniş növünə düşəndə iki dəfə sayıla bilər
        (şəbəkə üzrə ~%1,4 yuxarı). Çek sayı «Satış-filiallar üzrə» faylından gəlir və Analitika səhifəsindədir.
        Bu hesabatda məhsul məbləği yoxdur — menyu analizi üçün Analitika səhifəsinə baxın.
      </div>
    </div>
  )
}

/** Saat profili — 24 sütun, boş saatlar da görünür (kəsilmə gizlənməsin). */
function HourBars({ rows, total }: { rows: HourRow[]; total: number }) {
  const byHour = new Map(rows.map(r => [r.hour, r]))
  const all = Array.from({ length: 24 }, (_, h) => byHour.get(h) ?? { hour: h, net: 0, guests: 0 })
  const max = Math.max(...all.map(r => r.net), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', minWidth: 640, height: 150 }}>
        {all.map(r => {
          const pct = total > 0 ? r.net / total * 100 : 0
          return (
            <div key={r.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
              title={`${hh(r.hour)} · ${money(r.net)} · %${pct.toFixed(2)} · ${int(r.guests)} qonaq`}>
              <div style={{ fontSize: 9, color: '#8b8378' }}>{pct >= 4 ? `%${pct.toFixed(0)}` : ''}</div>
              <div style={{
                width: '100%', height: `${Math.max(2, r.net / max * 110)}px`, borderRadius: '3px 3px 0 0',
                background: r.net === 0 ? '#efeae1' : r.net === max ? '#C8102E' : '#26221d',
              }} />
              <div style={{ fontSize: 9.5, color: '#6b655c' }}>{String(r.hour).padStart(2, '0')}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Head() {
  return (
    <div style={{ marginBottom: 4 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🕐 Saatlıq Satış</h1>
      <div style={{ color: '#8b8378', fontSize: 12.5, marginTop: 4 }}>
        iiko «Doğan Tomris Rapor» hesabatından · saat × filial × ödəniş növü
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

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ background: '#faf8f4', border: '1px solid #eee9e0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{k}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#8b8378', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

const th: CSSProperties = { padding: '6px 8px', fontWeight: 700 }
const td: CSSProperties = { padding: '8px' }
