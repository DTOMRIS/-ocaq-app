'use client'

import { useState, type CSSProperties } from 'react'

export type ItemRow = { item: string; amount: number; cnt: number }
export type AccRow = { account: string; amount: number; cnt: number }
export type DayRow = { date: string; inflow: number; outflow: number }
export type BranchRow = { branch: string; amount: number; cnt: number }

const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const th: CSSProperties = { padding: '8px 10px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: '#8b8378', borderBottom: '1px solid #e6e1d7', background: '#faf7f1' }
const td: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #efeae0', fontVariantNumeric: 'tabular-nums' }
const money = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₼'
const int = (n: number) => Math.round(n).toLocaleString('ru-RU')

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...card, padding: '13px 15px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 10.5, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px' }}>{k}</div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4, color: tone ?? '#26221d' }}>{v}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#8b8378', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export default function PulClient(props: {
  empty?: string
  from?: string; to?: string
  inflow?: number; outflow?: number; cnt?: number; days?: number
  byItem?: ItemRow[]; byAccount?: AccRow[]; byDay?: DayRow[]; byBranch?: BranchRow[]
}) {
  const [gor, setGor] = useState<'madde' | 'hesab' | 'bolme'>('madde')

  if (props.empty) {
    return (
      <div style={{ padding: 20, maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>💸 Pul Axını</h1>
        <div style={{ ...card, padding: '44px 24px', textAlign: 'center', color: '#8b8378', fontSize: 13.5, lineHeight: 1.7 }}>{props.empty}</div>
      </div>
    )
  }

  const inflow = props.inflow ?? 0, outflow = props.outflow ?? 0
  const net = inflow + outflow
  const items = props.byItem ?? [], accs = props.byAccount ?? []
  const days = props.byDay ?? [], branches = props.byBranch ?? []
  const mx = Math.max(...days.map(d => Math.max(d.inflow, -d.outflow)), 1)

  // Satış mədaxili ayrıca — əməliyyat gəliri ilə maliyyə hərəkətini qarışdırmamaq üçün
  const satis = items.filter(i => /satışdan mədaxil/i.test(i.item)).reduce((s, i) => s + i.amount, 0)
  const kredit = items.filter(i => /kredit|təsisçi|möhkəmləndir|nağdlaşdırma/i.test(i.item)).reduce((s, i) => s + i.amount, 0)

  return (
    <div style={{ padding: 20, maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>💸 Pul Axını</h1>
        <p style={{ fontSize: 13, color: '#8b8378', marginTop: 3 }}>
          Bütün kassa və bank hərəkəti · {props.from} → {props.to} · {int(props.days ?? 0)} gün · {int(props.cnt ?? 0)} sətir
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat k="Daxil" v={money(inflow)} tone="#1c7a4e" sub={`satışdan ${money(satis)}`} />
        <Stat k="Xaric" v={money(outflow)} tone="#c8102e" />
        <Stat k="Xalis" v={money(net)} tone={net >= 0 ? '#1c7a4e' : '#c8102e'} />
        <Stat k="Maliyyə hərəkəti" v={money(kredit)} sub="kredit · təsisçi · nağdlaşdırma" tone="#8a6d1f" />
      </div>

      {/* Maliyyə hərəkəti əməliyyat gəlirindən AYRILIR: 7,5 mln kredit
          «xalis» rəqəmi şişirdir və şirkət pul qazanırmış kimi görünür. */}
      {Math.abs(kredit) > Math.abs(satis) * 0.5 && (
        <div style={{ ...card, background: '#fdf6e9', borderColor: '#e8dcc0', padding: '11px 14px', fontSize: 12.5, color: '#4d483f', lineHeight: 1.7 }}>
          <b>Diqqət — «Xalis» rəqəmi əməliyyat nəticəsi DEYİL.</b> İçində {money(kredit)} maliyyə
          hərəkəti var (bank krediti, təsisçi vəsaiti, nağdlaşdırma, hesab möhkəmləndirilməsi).
          Bunlar qazanc deyil, pul köçürməsidir. Əməliyyat nəticəsi üçün
          «Maddə» siyahısında satış və xərc sətirlərinə baxın.
        </div>
      )}

      {days.length > 1 && (
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8b8378', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Gün-gün</div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 90, overflowX: 'auto' }}>
            {days.map(d => (
              <div key={d.date} style={{ flex: '1 0 14px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 }} title={`${d.date}\n+${money(d.inflow)}\n${money(d.outflow)}`}>
                <div style={{ height: `${(d.inflow / mx) * 42}px`, background: '#1c7a4e', borderRadius: '2px 2px 0 0', minHeight: d.inflow > 0 ? 2 : 0 }} />
                <div style={{ height: `${(-d.outflow / mx) * 42}px`, background: '#c8102e', borderRadius: '0 0 2px 2px', minHeight: d.outflow < 0 ? 2 : 0 }} />
                <div style={{ fontSize: 8.5, color: '#a8a196', textAlign: 'center' }}>{d.date.slice(8)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {([['madde', 'Maddə üzrə'], ['hesab', 'Hesab üzrə'], ['bolme', 'Bölmə üzrə']] as const).map(([k, t]) => (
          <button key={k} onClick={() => setGor(k)}
            style={{ padding: '7px 14px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                     background: gor === k ? '#26221d' : '#f0ece4', color: gor === k ? '#fff' : '#6b655c' }}>{t}</button>
        ))}
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
            <thead><tr style={{ textAlign: 'left' }}>
              <th style={th}>{gor === 'madde' ? 'Maddə' : gor === 'hesab' ? 'Hesab' : 'Bölmə'}</th>
              <th style={{ ...th, textAlign: 'right' }}>Məbləğ</th>
              <th style={{ ...th, textAlign: 'right' }}>Sətir</th>
            </tr></thead>
            <tbody>
              {(gor === 'madde' ? items.map(x => ({ k: x.item, a: x.amount, c: x.cnt }))
                : gor === 'hesab' ? accs.map(x => ({ k: x.account, a: x.amount, c: x.cnt }))
                : branches.map(x => ({ k: x.branch, a: x.amount, c: x.cnt }))
              ).map(r => (
                <tr key={r.k}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.k}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: r.a >= 0 ? '#1c7a4e' : '#c8102e' }}>{money(r.a)}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#8b8378' }}>{int(r.c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {gor === 'bolme' && (
        <p style={{ fontSize: 12, color: '#8b8378' }}>
          Bölmə məlumatı YALNIZ «Baş kassa» vərəqində var — bank hesablarında filial göstərilmir.
          Ona görə bu siyahı bütün pulu deyil, yalnız nağd hərəkəti əhatə edir.
        </p>
      )}
    </div>
  )
}
