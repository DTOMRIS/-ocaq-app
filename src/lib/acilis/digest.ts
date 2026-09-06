// ─── Həftəlik departament xülasəsi ──────────────────────────────────────────
//
// NİYƏ PDF DEYİL: PDF göndərsən ertəsi gün köhnəlir və adamlar köhnə PDF-ə
// baxır. Xülasə YALNIZ rəqəmi verir və linkə göndərir — link həmişə cari
// siyahını açır. Excel lazım olsa siyahı səhifəsində «Excel-ə yüklə» var.

export type DigestVezife = {
  opening: string; task: string; dueDate: string | null; gate: string
}
export type DigestGirdi = {
  dept: string
  gecikmis: DigestVezife[]
  buHefte: DigestVezife[]
  acikCemi: number
  baseUrl: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const tarix = (d: string | null) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' }) : '—'

function cedvel(baslik: string, reng: string, list: DigestVezife[]): string {
  if (!list.length) return ''
  return `
    <p style="margin:22px 0 8px;font:600 13px/1.4 system-ui,sans-serif;color:${reng};
              text-transform:uppercase;letter-spacing:.08em">${esc(baslik)} · ${list.length}</p>
    <table style="width:100%;border-collapse:collapse;font:14px/1.5 system-ui,sans-serif">
      ${list.map(v => `
      <tr>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid #eee;white-space:nowrap;
                   font:600 13px/1.4 ui-monospace,monospace;color:${reng}">${tarix(v.dueDate)}</td>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid #eee;white-space:nowrap;
                   font-size:12px;color:#666">${esc(v.opening)}</td>
        <td style="padding:7px 0;border-bottom:1px solid #eee;color:#111">${esc(v.task)}</td>
      </tr>`).join('')}
    </table>`
}

/** Bir departamentin həftəlik xülasəsi. Boş qayıdırsa məktub GÖNDƏRİLMİR. */
export function digestHtml(g: DigestGirdi): string | null {
  if (!g.gecikmis.length && !g.buHefte.length) return null   // susmaq spamdan yaxşıdır
  const link = `${g.baseUrl}/dashboard/acilis/departament`
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;padding:24px">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e6e4;border-radius:10px;padding:26px 28px">
  <p style="margin:0;font:600 11px/1.4 ui-monospace,monospace;letter-spacing:.14em;
            text-transform:uppercase;color:#1D5C58">Shaurma №1 · Açılış Takibi</p>
  <h1 style="margin:8px 0 4px;font:700 22px/1.2 system-ui,sans-serif;color:#111">${esc(g.dept)}</h1>
  <p style="margin:0;font:14px/1.5 system-ui,sans-serif;color:#666">
    ${g.acikCemi} açıq vəzifə${g.gecikmis.length ? ` · <b style="color:#A34028">${g.gecikmis.length} gecikib</b>` : ''}
  </p>
  ${cedvel('Gecikmiş', '#A34028', g.gecikmis)}
  ${cedvel('Bu həftə', '#8C6A14', g.buHefte)}
  <a href="${link}" style="display:inline-block;margin-top:24px;background:#1D5C58;color:#fff;
     text-decoration:none;padding:11px 20px;border-radius:6px;font:600 14px system-ui,sans-serif">
    Tam siyahını aç</a>
  <p style="margin:20px 0 0;font:12px/1.5 system-ui,sans-serif;color:#999">
    Bu siyahı hər dəfə açılanda yenilənir — məktubdakı rəqəm göndərildiyi andakıdır.
  </p>
</div></body></html>`
}
