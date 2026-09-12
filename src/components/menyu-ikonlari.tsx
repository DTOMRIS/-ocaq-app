/**
 * MENYU İKONLARI — sidebar üçün, tək xətt üslubunda.
 *
 * NİYƏ AYRI FAYL (tab çubuğu ikonlarından): sidebar ikonları KİÇİKDİR (16px)
 * və həmişə tək rəngdədir — dolu/kontur variantı lazım deyil, aktivlik rənglə
 * və sol zolaqla verilir. Tab çubuğunda isə əksinə, dolu variant məcburidir.
 * İki fərqli iş, iki fərqli dəst.
 *
 * Hamısı 24×24 torda, 1.7px xətt. Emoji İŞLƏDİLMİR: hər cihazda başqa rəsm
 * çıxır, ölçüsü sətrə oturmur və rəngi dəyişmir.
 */

/** Açar → SVG məzmunu. Yeni menyu sətri əlavə edəndə bura da bir giriş yazılır. */
const YOLLAR: Record<string, React.ReactElement> = {
  panel: <><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>,
  sutun: <><path d="M3 21h18" /><rect x="4.5" y="12" width="4" height="6" rx="1.2" /><rect x="10" y="7.5" width="4" height="10.5" rx="1.2" /><rect x="15.5" y="4" width="4" height="14" rx="1.2" /></>,
  qrafik: <><path d="M3 20h18" /><path d="m4.5 15.5 5-5.5 3.5 3.5L20 6" /><path d="M15.5 6H20v4.5" /></>,
  saat: <><circle cx="12" cy="12" r="8.8" /><path d="M12 7v5.3l3.4 2" /></>,
  zibil: <><path d="M4 6.5h16" /><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" /><path d="M6 6.5 6.9 19a1.8 1.8 0 0 0 1.8 1.6h6.6a1.8 1.8 0 0 0 1.8-1.6L18 6.5" /><path d="M10 10.5v6M14 10.5v6" /></>,
  banka: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.6" /><circle cx="12" cy="12" r="2.8" /><path d="M6 12h.01M18 12h.01" /></>,
  axin: <><path d="M4 8h13" /><path d="m14 5 3 3-3 3" /><path d="M20 16H7" /><path d="m10 13-3 3 3 3" /></>,
  bina: <><path d="M3 21V8.6a1.5 1.5 0 0 1 .8-1.33l5.4-2.9A1.5 1.5 0 0 1 11.5 5.7V21" /><path d="M11.5 21V11.5a1.5 1.5 0 0 1 .9-1.37l6-2.6A1.5 1.5 0 0 1 20.5 8.9V21" /><path d="M2 21h20" /><path d="M15 14.5h2M6 11h2" /></>,
  menyu: <><rect x="4" y="2.8" width="16" height="18.4" rx="2.6" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  recetura: <><path d="M6.5 2.8h8.2L19 7.1V21.2H6.5z" /><path d="M14.3 2.8v4.6H19" /><path d="M9.4 12h6M9.4 16h4" /></>,
  promo: <><path d="M11.6 3.2 3.4 11.4a1.8 1.8 0 0 0 0 2.5l6.7 6.7a1.8 1.8 0 0 0 2.5 0l8.2-8.2V3.2z" /><circle cx="16.8" cy="7.2" r="1.5" /></>,
  liderlik: <><path d="M5 21V3.8" /><path d="M5 4.4h11.8l-2.1 3.6 2.1 3.6H5" /></>,
  siyahi: <><rect x="4" y="3" width="16" height="18" rx="2.8" /><path d="m8 9.2 1.7 1.7 3-3" /><path d="m8 15.8 1.7 1.7 3-3" /><path d="M15.4 10h1.4M15.4 16.6h1.4" /></>,
  hedef: <><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.8" /><circle cx="12" cy="12" r="1.3" /></>,
  shexs: <><circle cx="12" cy="8.2" r="3.8" /><path d="M4.6 20.6a7.6 7.6 0 0 1 14.8 0" /></>,
  zerf: <><rect x="2.6" y="5" width="18.8" height="14" rx="2.6" /><path d="m3.6 7 7.4 5.4a1.7 1.7 0 0 0 2 0L20.4 7" /></>,
  komanda: <><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20a6.3 6.3 0 0 1 12.4 0" /><path d="M16.2 5.2a3.4 3.4 0 0 1 0 5.6" /><path d="M17.8 14.6a6.3 6.3 0 0 1 3.4 5.4" /></>,
  sikayet: <><path d="M21 12.6c0 4.1-4 7.4-9 7.4-1 0-2-.13-2.9-.38L4 21.5l1.3-3.6C3.86 16.5 3 14.65 3 12.6 3 8.5 7 5.2 12 5.2s9 3.3 9 7.4Z" /><path d="M12 9.2v3.2" /><path d="M12 15.5h.01" /></>,
  zeng: <><path d="M18 8.6a6 6 0 1 0-12 0c0 6-2.2 7.4-2.2 7.4h16.4S18 14.6 18 8.6" /><path d="M13.7 19.4a2 2 0 0 1-3.4 0" /></>,
  magaza: <><path d="M3.6 9.6V20a1 1 0 0 0 1 1h14.8a1 1 0 0 0 1-1V9.6" /><path d="M2.4 9.6 4.2 4a1 1 0 0 1 .95-.7h13.7a1 1 0 0 1 .95.7l1.8 5.6a3 3 0 0 1-5.8 1 3 3 0 0 1-5.6 0 3 3 0 0 1-5.8-1Z" /></>,
  bolge: <><path d="M12 21.5s7.2-6.1 7.2-11.1a7.2 7.2 0 0 0-14.4 0C4.8 15.4 12 21.5 12 21.5Z" /><circle cx="12" cy="10.2" r="2.8" /></>,
  jurnal: <><path d="M4.6 3.4h11.3l3.5 3.5v13.7H4.6z" /><path d="M15.9 3.4v3.7h3.5" /><path d="M8 11h8M8 14.6h8M8 18.2h4.6" /></>,
  ayar: <><circle cx="12" cy="12" r="3.1" /><path d="M19.6 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a1.95 1.95 0 1 1-2.76 2.76l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.95 1.95 0 1 1-3.9 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.95 1.95 0 1 1-2.76-2.76l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.95 1.95 0 1 1 0-3.9h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.95 1.95 0 1 1 2.76-2.76l.06.06a1.6 1.6 0 0 0 1.77.32h.08A1.6 1.6 0 0 0 10.4 3.4v-.17a1.95 1.95 0 1 1 3.9 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.95 1.95 0 1 1 2.76 2.76l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.95 1.95 0 1 1 0 3.9h-.09a1.6 1.6 0 0 0-1.47.97Z" /></>,
}

export type MenyuIkonAdi = keyof typeof YOLLAR

export default function MenyuIkon({ ad, size = 16 }: { ad: string; size?: number }) {
  const icerik = YOLLAR[ad]
  // Tanınmayan açar → boş yer saxlanılır ki, sətirlər sürüşməsin
  if (!icerik) return <span style={{ display: 'inline-block', width: size, height: size }} aria-hidden />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden
         style={{ display: 'block', flexShrink: 0 }}>
      {icerik}
    </svg>
  )
}
