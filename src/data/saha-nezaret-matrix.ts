/**
 * Saha Nəzarət Matrisi — blok kataloqu
 *
 * Mənbə: `Shaurma_N1_Saha_Nezaret_Matrisi.xlsx` (6 vərəq: Təlimat · Matris ·
 * İdarə Panosu · Filial Kartı · P0 Reyestri · Sistem Tələbləri).
 * Dəstək Ofisi tərəfindən təsdiqlənmiş standart. 77 kontrol · 10 blok · 24 P0.
 *
 * ⚠️ VACİB — bu kataloq HƏLƏ TAM DEYİL.
 * Blok adları, kontrol SAYLARI və fokus sahələri mənbədən götürülüb (dəqiqdir),
 * lakin 77 kontrolun MƏTNLƏRİ hələ köçürülməyib. Mətnlər uydurulmur —
 * `docs/PRODUCT-COMPLETION-CONTRACT.md` saxta məlumatı qadağan edir.
 *
 * Buna görə `expectedCount` sahəsi var: motor (`src/lib/saha-nezaret.ts`)
 * `items.length !== expectedCount` olan bloku AŞKAR XƏTA ilə rədd edir.
 * Yəni yarımçıq kataloqla səhv bal hesablanması MÜMKÜN DEYİL — sistem
 * işləməkdən imtina edir. xlsx-dən mətnlər köçürüləndə bloklar öz-özünə açılır.
 */

/** Kontrolun cavab variantı. «Baxılmadı» bala GİRMİR (bax: scoreVisit). */
export const MATRIX_ANSWERS = ['beli', 'xeyr', 'baxilmadi', 'aid_deyil'] as const
export type MatrixAnswer = (typeof MATRIX_ANSWERS)[number]

/** Tapıntı prioriteti. P0 = təhlükəsizlik / qida təhlükəsizliyi / çek maddələri. */
export const MATRIX_PRIORITIES = ['P0', 'P1', 'P2'] as const
export type MatrixPriority = (typeof MATRIX_PRIORITIES)[number]

export interface MatrixControl {
  id: string
  label: string
  priority: MatrixPriority
  /** «Xeyr» cavabında foto sübutu tələb olunursa. */
  requiresPhoto?: boolean
  /** Ölçü (°C, qram, saniyə) daxil edilməli kontrollar. */
  measurementField?: boolean
  measurementUnit?: string
}

export interface MatrixBlock {
  id: string
  /** Mənbədəki blok adı (dəyişdirilmir). */
  title: string
  icon: string
  /** Mənbədəki fokus təsviri — auditora nə yoxlayacağını xatırladır. */
  focus: string
  /** Mənbədə bəyan edilmiş kontrol sayı. `items.length` bununla üst-üstə düşməlidir. */
  expectedCount: number
  items: MatrixControl[]
}

/**
 * 10 blok. Cəmi bəyan edilmiş kontrol: 8+7+5+7+10+5+6+11+9+9 = 77.
 * `items` massivləri xlsx-dən doldurulacaq.
 */
export const SAHA_NEZARET_BLOCKS: MatrixBlock[] = [
  {
    id: 'keyfiyyet',
    title: 'Keyfiyyət',
    icon: '🧪',
    focus: 'SKT, İGİÇ, defrost, soyuducu istiliyi',
    expectedCount: 8,
    items: [],
  },
  {
    id: 'shaurma-xetti',
    title: 'Şaurma xətti',
    icon: '🌯',
    focus: 'şiş, bıçaq, ət daxili istiliyi, porsiya',
    expectedCount: 7,
    items: [],
  },
  {
    id: 'pizza-xetti',
    title: 'Pizza xətti',
    icon: '🍕',
    focus: 'xəmir SKT, topping çəkisi, soba, stiker',
    expectedCount: 5,
    items: [],
  },
  {
    id: 'bar-qehve',
    title: 'Bar və Qəhvə',
    icon: '☕',
    focus: 'maşın təmizliyi, süd 4°C, kalibrasiya, CO₂',
    expectedCount: 7,
    items: [],
  },
  {
    id: 'xidmet',
    title: 'Xidmət',
    icon: '🤝',
    focus: 'qarşılama, sürət standartları, qiymət',
    expectedCount: 10,
    items: [],
  },
  {
    id: 'qonaqperverlik',
    title: 'Qonaqpərvərlik',
    icon: '🎈',
    focus: 'balon, uşaq stulu, şikayət proseduru',
    expectedCount: 5,
    items: [],
  },
  {
    id: 'catdirilma',
    title: 'Çatdırılma',
    icon: '📦',
    focus: 'ikinci göz, möhür, əlçatanlıq, jurnal',
    expectedCount: 6,
    items: [],
  },
  {
    id: 'temizlik',
    title: 'Təmizlik',
    icon: '🧼',
    focus: 'zal, mətbəx, tualet, avadanlıq',
    expectedCount: 11,
    items: [],
  },
  {
    id: 'insan',
    title: 'İnsan',
    icon: '👥',
    focus: 'pik-saat fasilə, LMS tamamlanma, geyim',
    expectedCount: 9,
    items: [],
  },
  {
    id: 'tehlukesizlik-avadanliq',
    title: 'Təhlükəsizlik və Avadanlıq',
    icon: '🧯',
    focus: 'qaz balonu, yanğın, elektrik, ilk yardım',
    expectedCount: 9,
    items: [],
  },
]

/** Mənbədə bəyan edilmiş cəmi kontrol sayı (77). */
export const DECLARED_CONTROL_COUNT = SAHA_NEZARET_BLOCKS.reduce(
  (sum, block) => sum + block.expectedCount,
  0,
)

/** Mənbədə bəyan edilmiş P0 sayı. Kataloq tamamlananda yoxlanılır. */
export const DECLARED_P0_COUNT = 24

/** Ziyarət dövrü — hər 15 gündə bir (mənbə: «Necə istifadə olunur» bölməsi). */
export const VISIT_CYCLE_DAYS = 15

/** Kataloq tam doldurulubmu? Doldurulmayıbsa motor bal hesablamır. */
export function isCatalogComplete(): boolean {
  return SAHA_NEZARET_BLOCKS.every((block) => block.items.length === block.expectedCount)
}
