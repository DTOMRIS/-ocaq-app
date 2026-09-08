'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

export type ProductRow = { item: string; qty: number; amount: number; hasRecipe: boolean }
export type MaterialUse = { material: string; unit: string; need: number; inProducts: number; isSemi: boolean }

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const th: CSSProperties = { padding: '8px 10px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }
const td: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }
const int = (n: number) => Math.round(n).toLocaleString('ru-RU')
const num3 = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
const money = (n: number) => int(n) + ' ₼'
const pct = (n: number) => `%${(n * 100).toFixed(1)}`

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4, color: tone ?? '#26221d' }}>{v}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#8b8378', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export default function ReceturaClient({ empty, period, periods = [], products = [], materials = [], stats }: {
  empty?: string
  period?: string | null
  periods?: string[]
  products?: ProductRow[]
  materials?: MaterialUse[]
  stats?: { products: number; materials: number; semi: number; covered: number; soldItems: number; coveredAmount: number; totalAmount: number }
}) {
  const router = useRouter()
  const [ara, setAra] = useState('')
  const [gorunus, setGorunus] = useState<'xammal' | 'ortusme'>('xammal')

  if (empty) {
    return (
      <div style={{ padding: 20, maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>🧾 Reçetura</h1>
        <div style={{ ...card, padding: '44px 24px', textAlign: 'center', color: '#8b8378', fontSize: 13.5, lineHeight: 1.7 }}>{empty}</div>
      </div>
    )
  }

  const st = stats!
  const coverage = st.totalAmount > 0 ? st.coveredAmount / st.totalAmount : 0
  const yox = products.filter(p => !p.hasRecipe)
  const mats = useMemo(() =>
    materials.filter(m => !ara || m.material.toLowerCase().includes(ara.toLowerCase())),
    [materials, ara])

  return (
    <div style={{ padding: 20, maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>🧾 Reçetura</h1>
          <p style={{ fontSize: 13, color: '#8b8378', marginTop: 3 }}>
            Satılan məhsullara görə hansı xammaldan nə qədər getməliydi
          </p>
        </div>
        {periods.length > 0 && (
          <select value={period ?? ''} onChange={e => router.push(`/dashboard/recetura?period=${e.target.value}`)}
                  style={{ ...card, padding: '7px 12px', fontSize: 13 }}>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat k="Reçeturada məhsul" v={int(st.products)} sub={`${int(st.materials)} xammal`} />
        <Stat k="Yarım mamul" v={int(st.semi)} sub="İSTEHSAL TƏDARÜK — açılır" />
        <Stat k="Örtüşmə (ciro)" v={pct(coverage)}
              sub={`${int(st.covered)}/${int(st.soldItems)} satılan məhsul`}
              tone={coverage >= 0.9 ? '#1c7a4e' : coverage >= 0.75 ? '#8a6d1f' : '#c8102e'} />
        <Stat k="Reçeturasız ciro" v={money(st.totalAmount - st.coveredAmount)}
              sub={`${int(yox.length)} məhsul`} tone={yox.length ? '#8a6d1f' : undefined} />
      </div>

      {/* Örtüşmə dürüst yazılır: reçeturası olmayan məhsulun xammalı hesaba
          GİRMİR. Bunu deməmək rəqəmi tam kimi göstərmək olardı. */}
      {coverage < 0.999 && (
        <div style={{ ...card, background: '#fdf6e9', borderColor: '#e8dcc0', padding: '11px 14px', fontSize: 12.5, color: '#4d483f', lineHeight: 1.7 }}>
          <b>Aşağıdakı miqdarlar reçeturası OLAN məhsullara aiddir</b> — cironun {pct(coverage)}-i.
          Qalan {int(yox.length)} məhsulun ({money(st.totalAmount - st.coveredAmount)}) reçeturası yoxdur və
          xammalı hesaba girmir. Əsasən kombo/set məhsullardır: tərkibi ayrı-ayrı məhsullardan ibarətdir,
          iiko onları vahid sətir kimi göndərir.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {(['xammal', 'ortusme'] as const).map(g => (
          <button key={g} onClick={() => setGorunus(g)}
                  style={{ padding: '7px 14px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13,
                           background: gorunus === g ? '#26221d' : '#f0ece4', color: gorunus === g ? '#fff' : '#6b655c', cursor: 'pointer' }}>
            {g === 'xammal' ? 'Tələb olunan xammal' : 'Reçeturası olmayanlar'}
          </button>
        ))}
        {gorunus === 'xammal' && (
          <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Xammal axtar…"
                 style={{ ...card, padding: '7px 12px', fontSize: 13, marginLeft: 'auto', minWidth: 180 }} />
        )}
      </div>

      {gorunus === 'xammal' ? (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
              <thead><tr style={{ textAlign: 'left' }}>
                <th style={th}>Xammal</th>
                <th style={{ ...th, textAlign: 'right' }}>Tələb olunan</th>
                <th style={{ ...th, textAlign: 'right' }}>Vahid</th>
                <th style={{ ...th, textAlign: 'right' }}>Neçə məhsulda</th>
              </tr></thead>
              <tbody>
                {mats.map(m => (
                  <tr key={m.material}>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {m.material}
                      {m.isSemi && <span style={{ marginLeft: 6, fontSize: 10, background: '#eef4f0', color: '#1c7a4e', padding: '1px 6px', borderRadius: 5 }}>yarım mamul</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{num3(m.need)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{m.unit || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{int(m.inProducts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
              <thead><tr style={{ textAlign: 'left' }}>
                <th style={th}>Məhsul</th>
                <th style={{ ...th, textAlign: 'right' }}>Ədəd</th>
                <th style={{ ...th, textAlign: 'right' }}>Ciro</th>
              </tr></thead>
              <tbody>
                {yox.map(p => (
                  <tr key={p.item}>
                    <td style={{ ...td, fontWeight: 600 }}>{p.item}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{int(p.qty)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
