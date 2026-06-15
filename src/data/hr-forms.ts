/**
 * KAHI HR Formları — OCAQ HR modülü üçün seed data
 * Mənbə: KAHI Restaurant F01-F19 (DK Agency © 2026)
 * AR Əmək Məcəlləsi, HACCP, AFSA, GDPR uyğun
 */

// ═══ F08-F09 Oryentasiya Checklist ═══
export interface OrientationItem {
  id: string;
  label: string;
  section: string;
}

export const ORIENTATION_SECTIONS = [
  {
    id: "company",
    title: "A.1 — Şirkət və Vəzifə Tanıtımı",
    for: "all" as const,
    items: [
      "Şirkətin tarixçəsi və brendi haqqında məlumat",
      "Missiya, vizyon və əsas dəyərlər",
      "Təşkilati struktur və idarəetmə pilləsi",
      "Departament strukturu və işçinin mövqeyi",
      "Vəzifə təlimatları və əmək funksiyaları (job description)",
      "Tabeçilik qaydası və qarşılıqlı əlaqələr",
      "İş saatları, fasilələr, yemək vaxtı",
      "Davamiyyət sistemi (giriş-çıxış qeydiyyatı)",
      "İcazə və məzuniyyət qaydaları",
      "Əməkhaqqı, mükafat və bonus sistemi",
      "Ödəniş tarixi və hesab nömrəsi qeydiyyatı",
      "Vergi və sosial sığorta tutulmaları",
      "DOST sistemində e-müqavilə yoxlanması",
      "WhatsApp komanda qrupu + rabitə vasitələri",
      "Telefon istifadəsi qaydaları",
      "Ad nişanı (badge) və paltar dəyişmə otağı",
    ],
  },
  {
    id: "policy",
    title: "A.2 — Siyasət və Qaydalar",
    for: "all" as const,
    items: [
      "Daxili nizam-intizam qaydaları",
      "Etik kodeks və davranış standartları",
      "Konfidensiallıq qaydaları və NDA",
      "Fərdi məlumatların qorunması",
      "Keyfiyyət siyasəti və hədəflər",
      "Prosedurlar və təlimatlarla tanışlıq",
      "Audit və yoxlamalar haqqında",
      "Şikayət və təklif sistemi",
      "Performans dəyərləndirmə sistemi",
    ],
  },
  {
    id: "safety",
    title: "A.3 — İş Təhlükəsizliyi",
    for: "all" as const,
    items: [
      "Yanğın təhlükəsizliyi və yanğınsöndürənlərin yeri",
      "Birinci yardım çantasının yeri və istifadəsi",
      "Təcili çıxışlar və evakuasiya planı",
      "İş qəzası baş verdikdə davranış qaydaları",
      "Təcili 102, 103, 112 nömrələri",
      "Elektrik və qaz təhlükəsizliyi",
    ],
  },
  {
    id: "kitchen",
    title: "C — Mətbəx Personalı",
    for: "kitchen" as const,
    items: [
      "Mətbəx zonalarının tanıtımı: soyuq, isti, hazırlıq",
      "Anbar tanıtımı: quru, soyuq, dondurulmuş",
      "Avadanlıqların tanıtımı və təhlükəsiz istifadəsi",
      "Şəxsi gigiyena: əl yuma 6 mərhələli WHO standartı",
      "Forma, önlük, baş örtüyü qaydaları",
      "Saç, dırnaq, zinət əşyaları qaydaları",
      "Sanitar kitabça yoxlaması",
      "HACCP — 7 prinsip qısa izahı",
      "Kritik nəzarət nöqtələri (CCP) və temperatur kontrolu",
      "FIFO prinsipi və etiketləmə",
      "Çapraz kontaminasiyanın qarşısının alınması",
      "Allergen menecmenti — 14 əsas allergen",
      "Resept standartları və porsion ölçüləri",
      "Mise en place — hazırlıq",
      "Plate-up (təqdimat) qaydaları",
      "Open/close checklist",
      "Tullantıların qeydiyyatı (food waste log)",
      "Stok sayımı və anbar yenilənməsi",
    ],
  },
  {
    id: "service",
    title: "D — Zal və Bar Personalı",
    for: "service" as const,
    items: [
      "Stol planı və nömrələnməsi",
      "Bar zonası və açıq mətbəx görünüşü",
      "POS sistemi — giriş, sifariş, modifikator, ödəniş",
      "Müştəri xidməti standartları (8 saniyə salam qaydası)",
      "Stol təqdimatı və su təklifi",
      "Sifariş alma sıralaması",
      "Yeməyin gətirilməsi (kim üçün, hansı tərəfdən)",
      "Stol yoxlaması (10 dəq qaydası)",
      "Hesab gətirmə və ödəniş qəbulu",
      "POS: endirim, promo kodu, sifariş ləğvi",
      "Menyu biliyi: tərkib, kalori, allergen",
      "Allergiya idarəetmə protokolu (kritik!)",
      "Şikayət idarəsi — LEARN modeli",
      "Upsell texnikaları — nəzakətli təklif",
      "Forma və şəxsi görünüş",
      "Çatdırılma platformaları (Wolt, Bolt Food)",
    ],
  },
];

// ═══ F13 Sınaq Müddəti Dəyərləndirmə ═══
export const TRIAL_CRITERIA = [
  { id: "tc1", label: "Texniki bacarıqlar", desc: "Vəzifəyə uyğun texniki biliyə malikdir" },
  { id: "tc2", label: "İş keyfiyyəti", desc: "Tapşırıqları dəqiq, vaxtında yerinə yetirir" },
  { id: "tc3", label: "Sürət və məhsuldarlıq", desc: "Pik vaxtlarda effektiv işləyir" },
  { id: "tc4", label: "Komanda işi", desc: "Həmkarlarla yola gedir, koordinasiyada iştirak edir" },
  { id: "tc5", label: "İntizam və punktuallıq", desc: "İş saatlarına və qaydalara riayət edir" },
  { id: "tc6", label: "Gigiyena və HACCP", desc: "Qida təhlükəsizliyi qaydalarına riayət edir" },
  { id: "tc7", label: "Müştəri yönümlü olma", desc: "Müştəri ilə düzgün ünsiyyət, problem həlli" },
  { id: "tc8", label: "Öyrənmə qabiliyyəti", desc: "Yeni məlumatları sürətlə mənimsəyir" },
  { id: "tc9", label: "Stress idarəsi", desc: "Pik vaxt və problemlərdə sakit qalır" },
  { id: "tc10", label: "Şəxsi görünüş", desc: "Forma və gigiyena qaydalarına riayət" },
];

// ═══ F16 Allergen — 14 əsas allergen ═══
export const ALLERGENS_14 = [
  { id: 1, name: "Qluten ehtiva edən taxıllar", examples: "Buğda, çovdar, arpa, yulaf" },
  { id: 2, name: "Qabıqlı dəniz məhsulları", examples: "Krevet, kerevit, krab" },
  { id: 3, name: "Yumurta", examples: "Bişmiş, çiy, toz" },
  { id: 4, name: "Balıq", examples: "Bütün balıq növləri" },
  { id: 5, name: "Yer fıstığı", examples: "Bütün məhsullarda" },
  { id: 6, name: "Soya", examples: "Soya sousu, lesitin, tofu" },
  { id: 7, name: "Süd və süd məhsulları", examples: "Süd, qaymaq, pendir, kərə yağı" },
  { id: 8, name: "Qoz-fındıq", examples: "Badam, qoz, fındıq, pekan" },
  { id: 9, name: "Kərəviz", examples: "Kök, yarpaq, toxum" },
  { id: 10, name: "Xardal", examples: "Toxum, toz, sous" },
  { id: 11, name: "Susam toxumu", examples: "Toxum, yağ, tahini" },
  { id: 12, name: "Sulfit (>10mg/kg)", examples: "Şərab, qurudulmuş meyvə" },
  { id: 13, name: "Lupin", examples: "Un, toxum" },
  { id: 14, name: "Mollyusk", examples: "Midiya, oktopod, kalmar" },
];

// ═══ İşə Qəbul Proseduru — Mərhələlər ═══
export const HIRING_STAGES = [
  { id: "need", label: "İşçi ehtiyacının müəyyənləşdirilməsi", responsible: "Şöbə müdiri → HR" },
  { id: "search", label: "Namizəd axtarışı (daxili + xarici)", responsible: "HR Meneceri" },
  { id: "screening", label: "Müraciətlərin ilkin qiymətləndirməsi", responsible: "HR Meneceri" },
  { id: "interview1", label: "Birinci müsahibə (HR) — 20-30 dəq", responsible: "HR Meneceri" },
  { id: "interview2", label: "İkinci müsahibə (texniki) + cooking test", responsible: "Şef-aşpaz / Zal Meneceri" },
  { id: "reference", label: "Tövsiyə yoxlanışı (F04)", responsible: "HR — min 2 əvvəlki iş yeri" },
  { id: "documents", label: "Sənədlərin yığılması", responsible: "HR + Namizəd" },
  { id: "contract", label: "DOST e-müqaviləsi + imzalar", responsible: "HR + Mühasibat" },
  { id: "orientation", label: "3 günlük oryantasiya (F08-F09)", responsible: "HR + Mentor" },
  { id: "trial", label: "3 aylıq sınaq müddəti (3x F13)", responsible: "Birbaşa rəhbər" },
];

// ═══ İşə Qəbulda Tələb Olunan Sənədlər ═══
export const REQUIRED_DOCUMENTS = [
  { id: "id", label: "Şəxsiyyət vəsiqəsi surəti", mandatory: true },
  { id: "edu", label: "Təhsil sənədi surəti", mandatory: true },
  { id: "sanitar", label: "Sanitar kitabçası (qida işçiləri)", mandatory: true },
  { id: "medical", label: "Tibbi arayış (Forma 086)", mandatory: true },
  { id: "photo", label: "3x4 ölçülü 2 ədəd foto", mandatory: true },
  { id: "bank", label: "Bank rekvizitləri (əməkhaqqı kartı)", mandatory: true },
  { id: "voen", label: "VOEN/SSN nömrəsi", mandatory: true },
  { id: "military", label: "Hərbi mükəlləfiyyət vəsiqəsi (kişilər)", mandatory: false },
  { id: "driver", label: "Sürücülük vəsiqəsi (lazımdırsa)", mandatory: false },
  { id: "labor", label: "Əmək kitabçası / e-əmək məlumatı", mandatory: false },
];
