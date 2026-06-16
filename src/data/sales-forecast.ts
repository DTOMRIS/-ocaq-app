/**
 * Satış Təxmini Sistemi — OCAQ
 * Mənbə: McDonald's Satış Təxmini Çalışma Kağızı + Scout WMA araşdırması
 *
 * Metodologiya:
 * 1. Keçən ilin eyni ayının NET satışını götür
 * 2. 10 uyğunluq faktorunu hesabla (hər biri +/- %)
 * 3. Toplam faktor % = bütün faktorların cəmi
 * 4. Əksetdirilən artma/düşmə = Keçən il satışı × Toplam faktor %
 * 5. Planlanan satış = Keçən il satışı + Əksetdirilən artma/düşmə
 */

export interface ForecastFactor {
  id: string;
  label: string;
  description: string;
  defaultPct: number; // default faiz dəyəri
  category: "structural" | "market" | "external";
}

export const FORECAST_FACTORS: ForecastFactor[] = [
  {
    id: "monthly_effect",
    label: "Aylıq Satış Effekti",
    description: "Bu aydakı Şənbə/Bazar sayı keçən ilin eyni ayından fərqlidirsə, bu fərqi əks etdir",
    defaultPct: 0,
    category: "structural",
  },
  {
    id: "qsc",
    label: "KST&D (Keyfiyyət, Servis, Təmizlik)",
    description: "KST&D-ni yaxşılaşdırmaq üçün xüsusi cəhdləriniz varsa müsbət (+) göstərin",
    defaultPct: 0,
    category: "structural",
  },
  {
    id: "promo_past",
    label: "Promolar (keçmiş — bu il yoxdur)",
    description: "Keçən il eyni ayda olub bu il təkrarlanmayan promo varsa mənfi (-) faktor",
    defaultPct: 0,
    category: "market",
  },
  {
    id: "promo_future",
    label: "Promolar (gələcək — bu il olacaq)",
    description: "Ediləcək promonun gözlənilən satış artışı. Bənzər promoların təsirini əsas al",
    defaultPct: 0,
    category: "market",
  },
  {
    id: "trend",
    label: "Restoran Satış Trendləri",
    description: "Son bir neçə ayda ortalama satış artması və ya düşməsi. Eyni trendin dəvam edəcəyini fərz et",
    defaultPct: 0,
    category: "structural",
  },
  {
    id: "investment",
    label: "Yeni İnvestisiyalar (restavrasiya, yeni sahə)",
    description: "Restoranınıza yeniləmə edilibsə gözlənilən satış artışını yansıdın",
    defaultPct: 0,
    category: "market",
  },
  {
    id: "new_product",
    label: "Yeni Məhsullar",
    description: "Menyuya yeni əlavə olunan məhsulların satış artışı təxmini",
    defaultPct: 0,
    category: "market",
  },
  {
    id: "competition",
    label: "Yeni Rəqabət",
    description: "Bölgənizə yeni rəqib gəlibsə mənfi (-) faktor. Marketinq müdürlə məsləhətləş",
    defaultPct: 0,
    category: "external",
  },
  {
    id: "construction",
    label: "Yerli İnşaat Fəaliyyətləri",
    description: "Yol təmiri, bina inşaatı və s. — müsbət və ya mənfi təsir",
    defaultPct: 0,
    category: "external",
  },
  {
    id: "weather",
    label: "Hava Şərtləri",
    description: "Keçən ilin pis havası bu il olmayacaqsa müsbət (+). Normal hava idisə mənfi (-)",
    defaultPct: 0,
    category: "external",
  },
];

/** Gün katsayıları — WMA ilə birlikdə günlük təxmin üçün */
export const DAY_COEFFICIENTS: Record<string, number> = {
  "B.e.": 0.72,  // Bazar ertəsi — ən aşağı
  "Ç.a.": 0.85,
  "Ç.":   0.90,
  "C.a.": 0.95,
  "C.":   1.15,  // Cümə — yüksəlir
  "Ş.":   1.30,  // Şənbə — pik
  "B.":   1.13,  // Bazar — yaxşı amma Şənbədən az
};

/** Mövsüm katsayıları — ay bazında */
export const SEASON_INDEX: Record<number, number> = {
  1: 0.85,   // Yanvar — aşağı
  2: 0.88,
  3: 0.95,   // Novruz effekti
  4: 1.00,
  5: 1.05,
  6: 1.10,   // Yay başlanğıc
  7: 1.08,
  8: 1.05,
  9: 1.02,
  10: 0.98,
  11: 0.92,
  12: 0.95,  // Yeni il effekti
};

/** Xüsusi günlər katsayıları */
export const SPECIAL_DAYS: { label: string; coefficient: number }[] = [
  { label: "Novruz bayramı", coefficient: 1.40 },
  { label: "Ramazan bayramı", coefficient: 1.35 },
  { label: "Qurban bayramı", coefficient: 1.30 },
  { label: "Ramazan ayı (gündüz)", coefficient: 0.70 },
  { label: "Ramazan ayı (iftar)", coefficient: 1.50 },
  { label: "Yeni il gecəsi", coefficient: 1.45 },
  { label: "Valentinlər günü", coefficient: 1.25 },
  { label: "Yağışlı gün", coefficient: 0.85 },
  { label: "Qarlı gün", coefficient: 0.70 },
  { label: "Çox isti gün (40°C+)", coefficient: 0.90 },
];

/**
 * WMA (Weighted Moving Average) hesablama
 * Son 4 həftənin eyni gününü ağırlıqlı ortala
 * Ağırlıqlar: [4, 3, 2, 1] — son həftə ən ağır
 */
export function calculateWMA(lastWeeks: number[]): number {
  const weights = [4, 3, 2, 1];
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let sum = 0;
  for (let i = 0; i < Math.min(lastWeeks.length, 4); i++) {
    sum += (lastWeeks[i] || 0) * weights[i];
  }
  return sum / totalWeight;
}

/**
 * Aylıq təxmin hesablama (McDonald's formulu)
 */
export function calculateMonthlyForecast(
  lastYearSales: number,
  factors: Record<string, number>,
): { totalFactorPct: number; adjustment: number; forecast: number } {
  const totalFactorPct = Object.values(factors).reduce((s, v) => s + v, 0);
  const adjustment = lastYearSales * (totalFactorPct / 100);
  const forecast = lastYearSales + adjustment;
  return { totalFactorPct, adjustment, forecast };
}

/**
 * Ət/toyuq hazırlama miqdarı təxmini
 * forecast satış sayı × resept çəkisi / (1 - fire_oranı)
 */
export function calculatePrepAmount(
  forecastCovers: number,
  avgPortionKg: number,
  fireRate: number, // 0.25 = %25
): { netNeed: number; grossOrder: number } {
  const netNeed = forecastCovers * avgPortionKg;
  const grossOrder = netNeed / (1 - fireRate);
  return { netNeed, grossOrder };
}
