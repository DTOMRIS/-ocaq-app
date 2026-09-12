/**
 * ALT ÇUBUQ İKONLARI — SF Symbols üslubunda.
 *
 * NİYƏ EMOJİ DEYİL: emoji hər cihazda BAŞQA görünür (Apple, Google, Samsung
 * ayrı rəsm çəkir), ölçüsü və xətt qalınlığı interfeysə uyğunlaşmır, rəngi
 * dəyişdirilə bilmir. Tab çubuğunda «hazır məhsul» hissini pozan birinci
 * şey budur.
 *
 * iOS qaydası: seçilməmiş ikon KONTUR, seçilmiş ikon DOLU olur — rəng fərqi
 * tək başına kiçik ekranda və günəş altında zəif oxunur. Hər ikona ona görə
 * `aktiv` variantı var.
 *
 * 24×24 tor, 1.8px xətt, yuvarlaq uc — iOS ölçüsü.
 */

type P = { aktiv?: boolean }
const ort = {
  width: 24, height: 24, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Panel — kvadrat tor (square.grid.2x2) */
export function IkonPanel({ aktiv }: P) {
  return (
    <svg {...ort}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={aktiv ? 'currentColor' : 'none'} />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={aktiv ? 'currentColor' : 'none'} />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={aktiv ? 'currentColor' : 'none'} />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill={aktiv ? 'currentColor' : 'none'} />
    </svg>
  )
}

/** Günlük — yüksələn xətt (chart.line.uptrend) */
export function IkonQrafik({ aktiv }: P) {
  return (
    <svg {...ort} strokeWidth={aktiv ? 2.4 : 1.8}>
      <path d="M3 20h18" opacity={aktiv ? 1 : .5} />
      <path d="M4.5 15.5 9.5 10l3.5 3.5L20 6" />
      <path d="M15.5 6H20v4.5" />
    </svg>
  )
}

/** Analitika — sütunlar (chart.bar) */
export function IkonSutun({ aktiv }: P) {
  return (
    <svg {...ort}>
      <rect x="3.5" y="12" width="4.2" height="8.5" rx="1.4" fill={aktiv ? 'currentColor' : 'none'} />
      <rect x="9.9" y="7" width="4.2" height="13.5" rx="1.4" fill={aktiv ? 'currentColor' : 'none'} />
      <rect x="16.3" y="3.5" width="4.2" height="17" rx="1.4" fill={aktiv ? 'currentColor' : 'none'} />
    </svg>
  )
}

/** Açılış — bina (building.2) */
export function IkonBina({ aktiv }: P) {
  return (
    <svg {...ort}>
      <path d="M3 21V8.5a1.5 1.5 0 0 1 .8-1.33l5.4-2.9A1.5 1.5 0 0 1 11.5 5.6V21"
            fill={aktiv ? 'currentColor' : 'none'} />
      <path d="M11.5 21V11.4a1.5 1.5 0 0 1 .9-1.37l6-2.6A1.5 1.5 0 0 1 20.5 8.8V21"
            fill={aktiv ? 'currentColor' : 'none'} />
      <path d="M2 21h20" />
      <path d="M15 14.5h2M15 17.5h2M6 11h2M6 14.5h2" stroke={aktiv ? '#fff' : 'currentColor'} opacity={aktiv ? .9 : .6} />
    </svg>
  )
}

/** KXT — siyahı və işarə (checklist) */
export function IkonSiyahi({ aktiv }: P) {
  return (
    <svg {...ort}>
      <rect x="4" y="3" width="16" height="18" rx="3" fill={aktiv ? 'currentColor' : 'none'} />
      <path d="m8 9.5 1.8 1.8L13 8" stroke={aktiv ? '#fff' : 'currentColor'} />
      <path d="m8 16 1.8 1.8L13 14.5" stroke={aktiv ? '#fff' : 'currentColor'} />
      <path d="M15.5 10h1.2M15.5 16.5h1.2" stroke={aktiv ? '#fff' : 'currentColor'} opacity=".8" />
    </svg>
  )
}

/** Hədəf — nişangah (target) */
export function IkonHedef({ aktiv }: P) {
  return (
    <svg {...ort}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.6" fill={aktiv ? 'currentColor' : 'none'} strokeWidth={aktiv ? 2.6 : 1.8} />
    </svg>
  )
}

/** Şikayət — nida qabarcığı (exclamationmark.bubble) */
export function IkonSikayet({ aktiv }: P) {
  return (
    <svg {...ort}>
      <path d="M21 12.6c0 4.1-4 7.4-9 7.4-1 0-2-.13-2.9-.38L4 21.5l1.3-3.6C3.86 16.5 3 14.65 3 12.6 3 8.5 7 5.2 12 5.2s9 3.3 9 7.4Z"
            fill={aktiv ? 'currentColor' : 'none'} />
      <path d="M12 9v3.4" stroke={aktiv ? '#fff' : 'currentColor'} strokeWidth="2" />
      <circle cx="12" cy="15.6" r=".9" fill={aktiv ? '#fff' : 'currentColor'} stroke="none" />
    </svg>
  )
}

/** Hamısı — üç nöqtə (ellipsis.circle) */
export function IkonHamisi({ aktiv }: P) {
  return (
    <svg {...ort}>
      <circle cx="12" cy="12" r="8.6" fill={aktiv ? 'currentColor' : 'none'} />
      <circle cx="8.2" cy="12" r="1.15" fill={aktiv ? '#fff' : 'currentColor'} stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill={aktiv ? '#fff' : 'currentColor'} stroke="none" />
      <circle cx="15.8" cy="12" r="1.15" fill={aktiv ? '#fff' : 'currentColor'} stroke="none" />
    </svg>
  )
}
