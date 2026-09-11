// ─── SİFARİŞ E-POÇTU ────────────────────────────────────────────────────────
//
// NİYƏ E-POÇTUN İÇİNDƏ CƏDVƏL (qoşma deyil): qoşma açılmır, telefonda heç
// açılmır. Anbar adamı poçtu açan kimi siyahını görməlidir. Excel lazım olsa
// səhifədə «CSV yüklə» var.
//
// NİYƏ MİQDAR BOŞ SƏTİR GÖNDƏRİLMİR: miqdarsız sətir gedərsə anbar «neçə?»
// deyə geri yazır və sifariş bir gün itir. Ölçü girilməyibsə göndəriş bloklanır.

export type MailSetri = { kat: string; ad: string; qty: string | null; vahid: string; qeyd: string | null }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const say = (v: string | null) => {
  if (v == null) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? String(n === Math.round(n) ? n : n) : esc(v)
}

export function sifarisMailHtml({ filial, dept, setirler, baseUrl, openingId, acilisTarixi }: {
  filial: string; dept: string; setirler: MailSetri[]
  baseUrl: string; openingId: string; acilisTarixi: string | null
}): string {
  const katlar = [...new Set(setirler.map(s => s.kat))]
  const bloklar = katlar.map(k => {
    const list = setirler.filter(s => s.kat === k)
    return `
    <p style="margin:22px 0 8px;font:600 13px/1.4 system-ui,sans-serif;color:#111;
              text-transform:uppercase;letter-spacing:.08em">${esc(k)} · ${list.length} sətir</p>
    <table style="width:100%;border-collapse:collapse;font:14px/1.5 system-ui,sans-serif">
      ${list.map(s => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;color:#111">${esc(s.ad)}${
          s.qeyd ? `<span style="display:block;font-size:12px;color:#888">${esc(s.qeyd)}</span>` : ''}</td>
        <td style="padding:6px 0 6px 10px;border-bottom:1px solid #eee;text-align:right;
                   white-space:nowrap;font:600 14px/1.5 ui-monospace,monospace">${say(s.qty)}</td>
        <td style="padding:6px 0 6px 6px;border-bottom:1px solid #eee;
                   white-space:nowrap;font-size:12px;color:#666">${esc(s.vahid)}</td>
      </tr>`).join('')}
    </table>`
  }).join('')

  return `<div style="max-width:640px;margin:0 auto;padding:28px 20px;font:14px/1.6 system-ui,sans-serif;color:#111">
  <p style="margin:0;font:600 12px/1.4 system-ui,sans-serif;color:#888;
            text-transform:uppercase;letter-spacing:.1em">Yeni filial sifarişi</p>
  <h1 style="margin:6px 0 2px;font:700 22px/1.3 system-ui,sans-serif">${esc(filial)}</h1>
  <p style="margin:0 0 4px;color:#666">${esc(dept)} · ${setirler.length} sətir${
    acilisTarixi ? ` · planlanan açılış <b>${esc(acilisTarixi)}</b>` : ''}</p>
  ${bloklar}
  <p style="margin:26px 0 0">
    <a href="${esc(baseUrl)}/dashboard/acilis/${esc(openingId)}"
       style="display:inline-block;background:#111;color:#fff;text-decoration:none;
              padding:10px 18px;border-radius:8px;font-weight:600">Siyahını portalda aç</a>
  </p>
  <p style="margin:14px 0 0;font-size:12px;color:#888">
    Gələn məhsulu portalda «gəldi» kimi işarələyin — siyahı hamı üçün eyni yerdə yenilənir.
  </p>
</div>`
}
