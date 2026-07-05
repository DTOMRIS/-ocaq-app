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

/**
 * Mövsüm katsayıları — ay bazında (Azərbaycan reallığı)
 * Qeyd: Ramazan və Məhərrəm hicri təqvimə görə hər il dəyişir,
 * buna görə onlar SPECIAL_DAYS-də ayrıca idarə olunur.
 */
export const SEASON_INDEX: Record<number, number> = {
  1: 0.80,   // Yanvar — bayramdan sonra ən aşağı, insanlar evdə
  2: 0.85,   // Fevral — hələ soyuq, hərəkət az
  3: 1.10,   // Mart — Novruz bayramı (20-24 mart), güclü artım
  4: 1.00,   // Aprel — normal
  5: 1.05,   // May — hava açılır, çöl oturma başlayır
  6: 1.15,   // İyun — yay, toy mövsümü başlayır, turizm
  7: 1.12,   // İyul — yay pik, amma çox isti günlər var
  8: 1.08,   // Avqust — yay davam, bəzi ailələr tətildə
  9: 1.05,   // Sentyabr — məktəb açılır, iş həyatı normal
  10: 1.00,  // Oktyabr — normal
  11: 0.90,  // Noyabr — soyuyur, bayırdakı oturma bağlanır
  12: 1.05,  // Dekabr — Yeni il hazırlığı, korporativ yeməklər
};

/**
 * Xüsusi günlər / dövrlər katsayıları — Azərbaycan reallığı
 *
 * KATEQORİYALAR:
 * - Dini bayramlar (hicri təqvim — hər il ~11 gün geri çəkilir)
 * - Milli bayramlar (sabit tarixlər)
 * - Mövsüm hadisələri
 * - Hava
 * - Biznes tipi fərqi (restoran vs şadlıq sarayı vs içkili məkan)
 */
export interface SpecialDay {
  label: string;
  coefficient: number;
  category: "dini" | "milli" | "movsum" | "hava" | "biznes";
  note?: string;
}

export const SPECIAL_DAYS: SpecialDay[] = [
  // ═══ DİNİ BAYRAMLAR ═══
  {
    label: "Ramazan ayı — gündüz (oruc vaxtı)",
    coefficient: 0.55,
    category: "dini",
    note: "Gündüz satış kəskin düşür, xüsusilə nahar saatları. Fast-food/dönər %40-50 düşə bilər",
  },
  {
    label: "Ramazan ayı — iftar vaxtı (axşam)",
    coefficient: 1.60,
    category: "dini",
    note: "İftar proqramları, ailə yeməkləri. İftar menyusu olan restoranlar güclü artım görür",
  },
  {
    label: "Ramazan bayramı (3 gün)",
    coefficient: 1.40,
    category: "dini",
    note: "Bayram yeməkləri, ailə ziyarətləri, restoranlara güclü tələb",
  },
  {
    label: "Qurban bayramı (3 gün)",
    coefficient: 1.20,
    category: "dini",
    note: "Evdə qurban kəsilir — restoran tələbi Ramazan bayramından azdır, amma yenə artır",
  },
  {
    label: "Məhərrəm ayı — ümumi",
    coefficient: 0.85,
    category: "dini",
    note: "Matəm ayı. Restoranlar normal, amma şadlıq sarayları və içkili məkanlar ciddi düşür",
  },
  {
    label: "Məhərrəm — şadlıq sarayı / toy məkanı",
    coefficient: 0.20,
    category: "dini",
    note: "Toylar keçirilmir, şadlıq sarayları demək olar boşdur. Ən ağır düşüş bu seqmentdə",
  },
  {
    label: "Məhərrəm — içkili restoran / bar",
    coefficient: 0.50,
    category: "dini",
    note: "İçki satışı kəskin düşür. Bəzi müştərilər matəm səbəbiylə gəlmir",
  },
  {
    label: "Aşura günü (Məhərrəmin 10-cu günü)",
    coefficient: 0.65,
    category: "dini",
    note: "Ən güclü matəm günü. Bütün restoran tipləri üçün düşüş",
  },

  // ═══ MİLLİ BAYRAMLAR ═══
  {
    label: "Novruz bayramı (20-24 Mart, 5 gün)",
    coefficient: 1.45,
    category: "milli",
    note: "Ən güclü milli bayram. Ailə yeməkləri, səməni, tonqal. Restoranlara böyük tələb",
  },
  {
    label: "Yeni il gecəsi (31 Dekabr)",
    coefficient: 1.50,
    category: "milli",
    note: "Korporativ yeməklər, ailə gecəsi. Əvvəlcədən rezervasiya tələb olunur",
  },
  {
    label: "Yeni il tətili (1-3 Yanvar)",
    coefficient: 0.75,
    category: "milli",
    note: "İnsanlar evdə, restoran trafiki aşağı. Amma turist bölgələri fərqli ola bilər",
  },
  {
    label: "14 Fevral — Sevgililər Günü",
    coefficient: 1.30,
    category: "milli",
    note: "Cütlük yeməkləri, xüsusi menyu. Axşam rezervasiyası dolu olur",
  },
  {
    label: "8 Mart — Qadınlar Günü",
    coefficient: 1.25,
    category: "milli",
    note: "Korporativ və ailə yeməkləri. Azərbaycanda güclü bayram",
  },
  {
    label: "Respublika Günü (28 May)",
    coefficient: 1.05,
    category: "milli",
    note: "İş günü deyil, bəzi insanlar çölə çıxır",
  },

  // ═══ MÖVSÜM HADİSƏLƏRİ ═══
  {
    label: "Toy mövsümü pik (İyun-Sentyabr)",
    coefficient: 1.10,
    category: "movsum",
    note: "Toy hazırlığı, qonaq ağırlamaq. Catering sifarişləri artır",
  },
  {
    label: "Məktəb açılışı (15 Sentyabr)",
    coefficient: 1.05,
    category: "movsum",
    note: "Ailə yeməkləri, uşaq menyusu tələbi artır",
  },
  {
    label: "İmtahan dövrü (May-İyun)",
    coefficient: 0.95,
    category: "movsum",
    note: "Tələbə seqmenti evdə oxuyur, amma gecə kafeləri artır",
  },
  {
    label: "Formula 1 Bakı (İyun)",
    coefficient: 1.35,
    category: "movsum",
    note: "Turist axını. Şəhər mərkəzi restoranları üçün ən güclü həftə",
  },
  {
    label: "Korporativ il sonu (Dekabr 15-30)",
    coefficient: 1.20,
    category: "movsum",
    note: "Şirkət yeməkləri, komanda gecələri",
  },

  // ═══ HAVA ═══
  {
    label: "Yağışlı gün",
    coefficient: 0.85,
    category: "hava",
    note: "Piyada trafiki düşür. Delivery artır amma oturma azalır",
  },
  {
    label: "Qarlı gün",
    coefficient: 0.65,
    category: "hava",
    note: "Güclü düşüş. Nəqliyyat çətinliyi, insanlar evdə",
  },
  {
    label: "Çox isti gün (40°C+)",
    coefficient: 0.85,
    category: "hava",
    note: "Gündüz çölə çıxmırlar. Soyuq içki + dondurma satışı artır, isti yemək azalır",
  },
  {
    label: "Gözəl yaz/payız günü (20-25°C)",
    coefficient: 1.10,
    category: "hava",
    note: "Çöl terası dolu, piyada trafik artır",
  },

  // ═══ BİZNES TİPİNƏ GÖRƏ ═══
  {
    label: "Futbol oyun günü (yerli stadion)",
    coefficient: 1.20,
    category: "biznes",
    note: "Stadion yaxınlığındakı restoranlar üçün. Oyundan əvvəl və sonra pik",
  },
  {
    label: "Elektrik/su kəsintisi",
    coefficient: 0.40,
    category: "biznes",
    note: "Generator yoxdursa fəlakət. Varsa belə mətbəx kapasitəsi düşür",
  },
  {
    label: "Rəqib qonşuda açıldı (ilk ay)",
    coefficient: 0.80,
    category: "biznes",
    note: "Yeni rəqibin maraq effekti. 2-3 aydan sonra normallaşır",
  },
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
