import Link from 'next/link'

/**
 * «Bu ekran hələ saxlamır» xəbərdarlığı.
 *
 * NİYƏ SƏHİFƏNİ SİLMİRİK: `AGENTS.md` §2 bu route-ları silməyi və boş
 * placeholder ilə əvəz etməyi QADAĞAN edir. Ekranlar hesablama/siyahı kimi
 * işləyir — problem funksiyada yox, GÖZLƏNTİDƏDİR: müdir sayım girib
 * «yadda saxladım» sanır, səhifə yenilənəndə hər şey itir.
 *
 * NİYƏ SADƏCƏ XƏBƏRDARLIQ YOX, HƏM DƏ YÖNLƏNDİRMƏ: adama «bu işləmir»
 * demək yarım cavabdır. İşləyən ekran varsa onun linki dərhal verilir —
 * yoxsa adam nə edəcəyini bilmir və işi yarımçıq qoyur.
 */
export default function SaxlanmirXeberdarligi({ evezi, evezUrl, qeyd }: {
  /** İşləyən alternativ ekranın adı — varsa. */
  evezi?: string
  evezUrl?: string
  /** Bu ekranın nəyə YARADIĞI — tam dəyərsiz deyil, ona görə yazılır. */
  qeyd?: string
}) {
  return (
    <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900">
          NÜMUNƏ EKRAN
        </span>
        <p className="text-sm font-semibold text-amber-900">
          Bu səhifə məlumatı YADDA SAXLAMIR — səhifə yenilənəndə girdiyiniz hər şey itir.
        </p>
      </div>
      {qeyd && <p className="mt-2 text-sm leading-6 text-amber-900/80">{qeyd}</p>}
      {evezi && evezUrl && (
        <Link href={evezUrl}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-900 px-3.5 py-2 text-sm font-semibold text-white">
          İşləyən ekran: {evezi} →
        </Link>
      )}
    </div>
  )
}
