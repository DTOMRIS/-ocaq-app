import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Hesabatlar — OCAQ' }

// ─── Filial gerçəkləşmə məlumatları (2025 iyul → 2026 iyul gedişat) ──────────
type Row = { filial: string; mudir: string; y2025: number; y2026: number }

const DATA: Row[] = [
  { filial: 'Bulvar',         mudir: 'İsmayıl', y2025: 194144, y2026: 258990 },
  { filial: 'Bayıl',          mudir: 'İsmayıl', y2025: 149761, y2026: 169373 },
  { filial: 'Hüseyn Cavid',   mudir: 'Ceyhun',  y2025: 122387, y2026: 137574 },
  { filial: 'Bakıxanov 1',    mudir: 'Elnur',   y2025:  89142, y2026:  98769 },
  { filial: 'Neftçilər',      mudir: 'Elnur',   y2025: 117653, y2026: 129601 },
  { filial: 'Nərimanov',      mudir: 'Taleh',   y2025: 112695, y2026: 122948 },
  { filial: 'Duet',           mudir: 'Taleh',   y2025: 197858, y2026: 211016 },
  { filial: 'Binəqədi',       mudir: 'Taleh',   y2025: 116515, y2026: 123608 },
  { filial: 'Seabreeze',      mudir: 'Ramin',   y2025: 334943, y2026: 352819 },
  { filial: 'Ayna Sultanova', mudir: 'Taleh',   y2025:  64036, y2026:  67436 },
  { filial: 'İnşaatçılar',    mudir: 'Ceyhun',  y2025: 113772, y2026: 115640 },
  { filial: '5 Mərtəbə',      mudir: 'İsmayıl', y2025: 208237, y2026: 210789 },
  { filial: 'Amay',           mudir: 'Taleh',   y2025: 102925, y2026: 101951 },
  { filial: 'Gəncə',          mudir: 'Ramin',   y2025:  33315, y2026:  32644 },
  { filial: 'Bakıxanov 2',    mudir: 'Elnur',   y2025:  90333, y2026:  88423 },
  { filial: 'Mərdəkan',       mudir: 'Ramin',   y2025: 368946, y2026: 360229 },
  { filial: 'Zığ',            mudir: 'Elnur',   y2025:  95695, y2026:  92410 },
  { filial: 'Həzi Aslanov',   mudir: 'Elnur',   y2025:  86973, y2026:  83577 },
  { filial: 'Əcəmi',          mudir: 'Ceyhun',  y2025: 158009, y2026: 150681 },
  { filial: 'Bilgəh',         mudir: 'Ramin',   y2025: 194129, y2026: 182679 },
  { filial: 'Masazır',        mudir: 'Ceyhun',  y2025:  85089, y2026:  77621 },
  { filial: 'Torgoviy',       mudir: 'İsmayıl', y2025: 293932, y2026: 267285 },
  { filial: 'Space',          mudir: 'Ceyhun',  y2025: 208145, y2026: 185960 },
  { filial: 'İnqilab',        mudir: 'Ramin',   y2025:  83134, y2026:  73285 },
  { filial: 'Corner',         mudir: 'İsmayıl', y2025: 194593, y2026: 166270 },
  { filial: 'Badamdar',       mudir: 'İsmayıl', y2025:  64909, y2026:  54783 },
  { filial: 'Azadlıq',        mudir: 'Taleh',   y2025:  41331, y2026:  32379 },
  { filial: 'Əhmədli',        mudir: 'Elnur',   y2025:  63530, y2026:  47782 },
  { filial: 'Sumqayıt',       mudir: 'Ceyhun',  y2025:  51219, y2026:  37400 },
]

const nf = (n: number) => n.toLocaleString('en-US')
const pct = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100)

export default async function ReportsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin' && session.user.role !== 'region_manager') {
    redirect('/dashboard')
  }

  // Sətirlər — gerçəkləşməyə görə azalan
  const rows = DATA
    .map(r => ({ ...r, real: pct(r.y2026, r.y2025) }))
    .sort((a, b) => b.real - a.real)

  const total25 = DATA.reduce((s, r) => s + r.y2025, 0)
  const total26 = DATA.reduce((s, r) => s + r.y2026, 0)
  const totalReal = pct(total26, total25)

  // Bölgə müdiri üzrə xülasə
  const byMudir = Object.values(
    rows.reduce((acc, r) => {
      const m = (acc[r.mudir] ??= { mudir: r.mudir, y2025: 0, y2026: 0, count: 0, up: 0 })
      m.y2025 += r.y2025; m.y2026 += r.y2026; m.count++
      if (r.real >= 100) m.up++
      return acc
    }, {} as Record<string, { mudir: string; y2025: number; y2026: number; count: number; up: number }>)
  )
    .map(m => ({ ...m, real: pct(m.y2026, m.y2025) }))
    .sort((a, b) => b.real - a.real)

  const green = '#166534'
  const greenBg = '#d9ead3'
  const red = '#c0392b'

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
        Filial gerçəkləşmə hesabatı
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px' }}>
        2025 iyul → 2026 iyul gedişat müqayisəsi ({DATA.length} filial)
      </p>

      {/* Grand Total */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
        marginBottom: '24px',
      }}>
        {[
          { label: '2025 iyul (cəmi)', value: nf(total25), color: '#1a1a1a' },
          { label: '2026 iyul gedişat', value: nf(total26), color: '#1a1a1a' },
          { label: 'Ümumi gerçəkləşmə', value: `${totalReal.toFixed(1)}%`, color: totalReal >= 100 ? green : red },
        ].map(k => (
          <div key={k.label} style={{
            background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px',
          }}>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px', fontWeight: 500 }}>{k.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Bölgə müdiri xülasəsi */}
      <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' }}>
        Bölgə müdiri üzrə
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px',
        marginBottom: '28px',
      }}>
        {byMudir.map(m => (
          <div key={m.mudir} style={{
            background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>{m.mudir}</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: m.real >= 100 ? green : red }}>
                {m.real.toFixed(1)}%
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
              {m.up}/{m.count} filial hədəfdə • {nf(m.y2026)}
            </p>
          </div>
        ))}
      </div>

      {/* Filial cədvəli */}
      <div style={{
        background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
            <thead>
              <tr style={{ background: '#f7f7f7', borderBottom: '1px solid #ececec' }}>
                <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Filial</th>
                <th style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Bölgə müdiri</th>
                <th style={{ textAlign: 'right', padding: '11px 16px', fontWeight: 600, color: '#666' }}>2025 iyul</th>
                <th style={{ textAlign: 'right', padding: '11px 16px', fontWeight: 600, color: '#666' }}>2026 iyul gedişat</th>
                <th style={{ textAlign: 'right', padding: '11px 16px', fontWeight: 600, color: '#666' }}>Gerçəkləşmə ▼</th>
              </tr>
              <tr style={{ background: '#fbeeee', borderBottom: '1px solid #ececec' }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: red }}>Grand Total</td>
                <td style={{ padding: '10px 16px' }}></td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: red }}>{nf(total25)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: red }}>{nf(total26)}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: red }}>{totalReal.toFixed(1)}%</td>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isGreen = r.real >= 100
                return (
                  <tr key={r.filial} style={{
                    borderBottom: i === rows.length - 1 ? 'none' : '1px solid #f2f2f2',
                    background: isGreen ? greenBg : '#fff',
                  }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a1a1a' }}>{r.filial}</td>
                    <td style={{ padding: '10px 16px', color: '#555' }}>{r.mudir}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{nf(r.y2025)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{nf(r.y2026)}</td>
                    <td style={{
                      padding: '10px 16px', textAlign: 'right', fontWeight: 700,
                      color: isGreen ? green : '#1a1a1a', fontVariantNumeric: 'tabular-nums',
                    }}>{r.real.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
