'use client'

import { type CSSProperties } from 'react'
import { boyumeAyir, zonayaYig, type FilialDovr } from '@/lib/analytics/growth-split'

const money = (n: number) =>
  (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼'
const plain = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + '₼'
const card: CSSProperties = { background: '#fff', border: '1px solid #e6e1d7', borderRadius: 14 }
const YAS = '#1c7a4e', QIR = '#c8102e', BOZ = '#8b8378'
const reng = (n: number) => (n > 0 ? YAS : n < 0 ? QIR : BOZ)

/**
 * BÖYÜMƏ AYIRICISI — paneldəki tək «YoY %» rəqəmini üç hissəyə bölür.
 *
 * NİYƏ: «avqust keçən ildən %8 çoxdur» cümləsinin içində üç fərqli hadisə var
 * və üçü fərqli qərar tələb edir — eyni filialın işi, yeni açılışın töhfəsi,
 * bağlanan filialın itkisi. Ayrılmasa Masazır «−100%», Səbail 3 «+∞» görünür
 * və heç biri şəbəkənin performansı deyil.
 *
 * ƏSAS RƏQƏM ORTADAKI DEYİL, «EYNİ FİLİAL»-dır: şəbəkə həqiqətən böyüdümü
 * sualının cavabı odur. Ona görə ən böyük yazılır.
 */
export default function BoyumeBlok({ setirler }: { setirler: FilialDovr[] }) {
  if (!setirler.length) return null
  const a = boyumeAyir(setirler)
  const zonalar = zonayaYig(setirler).filter(z => z.paylasilan)

  const parcalar = [
    { ad: 'Eyni filial', deyer: a.eyni, say: a.say.eyni,
      izah: 'hər iki dövrdə işləyən filiallar — ƏSL performans' },
    { ad: 'Yeni filial', deyer: a.yeni, say: a.say.yeni,
      izah: 'yalnız bu dövrdə olanlar — investisiya töhfəsi' },
    { ad: 'Bağlanan', deyer: a.baglanan, say: a.say.baglanan,
      izah: 'yalnız keçən dövrdə olanlar — itən ciro' },
  ].filter(p => p.say > 0)

  return (
    <div style={{ ...card, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
                       textTransform: 'uppercase', color: BOZ }}>Böyümə haradan gəlir</span>
        <span style={{ fontSize: 12, color: BOZ }}>
          xalis {money(a.xalis)} — aşağıdakı üç sətrin cəmi
        </span>
      </div>

      {/* ƏSL RƏQƏM — ən böyük yazılır */}
      <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1px solid #efeae0' }}>
        <p style={{ margin: 0, fontSize: 12.5, color: BOZ }}>
          Eyni filiallar (like-for-like) · {a.say.eyni} filial
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 800, lineHeight: 1.1,
                    color: reng(a.eyni), fontVariantNumeric: 'tabular-nums' }}>
          {a.eyniFaiz != null ? (a.eyniFaiz >= 0 ? '+' : '') + a.eyniFaiz.toFixed(1) + '%' : '—'}
          <span style={{ fontSize: 15, fontWeight: 600, color: BOZ, marginLeft: 10 }}>
            {money(a.eyni)}
          </span>
        </p>
        {a.eyniFaiz == null && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: BOZ }}>
            Keçən dövrdə müqayisə edilə bilən filial yoxdur — faiz hesablanmır.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gap: 1, background: '#efeae0', marginTop: 12,
                    gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
                    border: '1px solid #efeae0', borderRadius: 10, overflow: 'hidden' }}>
        {parcalar.map(p => (
          <div key={p.ad} style={{ background: '#fff', padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 12.5, color: BOZ }}>{p.ad} · {p.say}</p>
            <p style={{ margin: '2px 0 0', fontSize: 19, fontWeight: 700,
                        color: reng(p.deyer), fontVariantNumeric: 'tabular-nums' }}>
              {money(p.deyer)}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: BOZ, lineHeight: 1.4 }}>{p.izah}</p>
          </div>
        ))}
      </div>

      {a.say.bos > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: QIR, fontWeight: 600 }}>
          ⚠ {a.say.bos} filialın hər iki dövrdə satışı sıfırdır — açıqdırsa bu ciddi haldır.
        </p>
      )}

      {/* ── ZONA ── yalnız birdən çox filialı olan zonalar */}
      {zonalar.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #efeae0' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
                      textTransform: 'uppercase', color: BOZ }}>Ticarət zonası</p>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: BOZ, maxWidth: '62ch', lineHeight: 1.5 }}>
            Bir-birinə çox yaxın filiallar eyni qonaq kütləsini bölüşür. Ayrı baxanda
            biri «çökür», digəri «böyüyür» görünür — əslində köçürmə olur.
          </p>
          {zonalar.map(z => (
            <div key={z.zona} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
                                       gap: '4px 12px', padding: '9px 0',
                                       borderTop: '1px solid #f4f0e8' }}>
              <b style={{ fontSize: 14.5, minWidth: 92 }}>{z.zona}</b>
              <span style={{ fontSize: 12.5, color: BOZ, flex: '1 1 190px' }}>
                {z.filiallar.join(' + ')}
              </span>
              <span style={{ fontSize: 12.5, color: BOZ, fontVariantNumeric: 'tabular-nums' }}>
                {plain(z.kecen)} → {plain(z.cari)}
              </span>
              <b style={{ fontSize: 15, color: reng(z.xalis), fontVariantNumeric: 'tabular-nums',
                          minWidth: 96, textAlign: 'right' }}>
                {money(z.xalis)}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
