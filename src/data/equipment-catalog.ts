/**
 * Ekipman Kataloqu — Admin store bazlı ekipman əlavə edəndə buradan seçir.
 * Hər ekipman tipinin öz bakım checklist-i var (tezliyə görə).
 * Mənbə: MƏK F 04 + Scout araştırma (McDonald's PM, NFPA 96, HACCP)
 */

export type MaintenanceFreq = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannual" | "annual";

export interface MaintenanceTask {
  id: string;
  task: string;
  freq: MaintenanceFreq;
  critical?: boolean; // güvenlik/HACCP — gecikərsə QIRMIZI
}

export interface EquipmentType {
  id: string;
  name: string;
  category: string;
  icon: string;
  maintenance: MaintenanceTask[];
}

const FREQ_LABEL: Record<MaintenanceFreq, string> = {
  daily: "Gündəlik",
  weekly: "Həftəlik",
  biweekly: "15 gündə",
  monthly: "Aylıq",
  quarterly: "3 aylıq",
  biannual: "6 aylıq",
  annual: "İllik",
};
export { FREQ_LABEL };

export const EQUIPMENT_CATALOG: EquipmentType[] = [
  // ═══ PİŞİRMƏ ═══
  {
    id: "doner-ocagi",
    name: "Dönər Ocağı",
    category: "Pişirmə",
    icon: "🔥",
    maintenance: [
      { id: "d1", task: "Motor işləmə yoxlaması", freq: "weekly" },
      { id: "d2", task: "Termostat işləmə yoxlaması", freq: "weekly" },
      { id: "d3", task: "Alt məcməyi təmizliyi", freq: "weekly" },
      { id: "d4", task: "Şişlərin yoxlaması (əyilmə, aşınma)", freq: "weekly" },
      { id: "d5", task: "Brülör təmizliyi", freq: "monthly" },
      { id: "d6", task: "Elektrik kabel yoxlaması", freq: "monthly" },
      { id: "d7", task: "Qaz hortumu yoxlaması (çat, aşınma)", freq: "monthly", critical: true },
      { id: "d8", task: "Qaz hortumu dəyişdirmə", freq: "annual", critical: true },
    ],
  },
  {
    id: "pizza-firini-gazli",
    name: "Pizza Fırını (Gazlı)",
    category: "Pişirmə",
    icon: "🍕",
    maintenance: [
      { id: "pf1", task: "Fırın daşı/kayrak təmizliyi", freq: "weekly" },
      { id: "pf2", task: "Brülör təmizliyi", freq: "monthly" },
      { id: "pf3", task: "Termostat kalibrasiya yoxlaması", freq: "monthly" },
      { id: "pf4", task: "Qaz kaçaq testi (sabun köpüyü metodu)", freq: "monthly", critical: true },
      { id: "pf5", task: "Emniyet valfi (solenoid) yoxlaması", freq: "quarterly", critical: true },
      { id: "pf6", task: "Baca / çıxış borusu təmizliyi", freq: "quarterly" },
      { id: "pf7", task: "CO alarm testi", freq: "quarterly", critical: true },
      { id: "pf8", task: "Tam texniki servis (firma)", freq: "annual" },
    ],
  },
  {
    id: "fritoz",
    name: "Fritöz",
    category: "Pişirmə",
    icon: "🍟",
    maintenance: [
      { id: "fr1", task: "Yağ keyfiyyəti yoxlaması (test şeridi)", freq: "daily" },
      { id: "fr2", task: "Yağ filtrasiyası", freq: "daily" },
      { id: "fr3", task: "Yağ dəyişdirmə", freq: "weekly" },
      { id: "fr4", task: "Gözləmə kabinəsi təmizliyi", freq: "weekly" },
      { id: "fr5", task: "Vanna boil-out təmizliyi", freq: "biweekly" },
      { id: "fr6", task: "İsidici element yoxlaması", freq: "monthly" },
      { id: "fr7", task: "Hi-limit təhlükəsizlik termostatı testi", freq: "monthly", critical: true },
      { id: "fr8", task: "Yoxlama paneli təmizliyi", freq: "monthly" },
      { id: "fr9", task: "Elektrik kabel yoxlaması", freq: "monthly" },
    ],
  },
  {
    id: "flat-grill",
    name: "Flat Grill / Tava",
    category: "Pişirmə",
    icon: "🥩",
    maintenance: [
      { id: "fg1", task: "Səthi təmizləmə + yağlama", freq: "daily" },
      { id: "fg2", task: "Termostat yoxlaması", freq: "monthly" },
      { id: "fg3", task: "Qızdırıcı element yoxlaması", freq: "quarterly" },
    ],
  },
  {
    id: "toster",
    name: "Toster / Salamander",
    category: "Pişirmə",
    icon: "🍞",
    maintenance: [
      { id: "t1", task: "Qırıntı qabının təmizliyi", freq: "daily" },
      { id: "t2", task: "İstilik elementi yoxlaması", freq: "monthly" },
      { id: "t3", task: "Termostat kalibrasiyası", freq: "quarterly" },
    ],
  },

  // ═══ HAMUR / PİZZA ═══
  {
    id: "hamur-yogurma",
    name: "Hamur Yoğurma Maşını",
    category: "Hamur / Pizza",
    icon: "🫗",
    maintenance: [
      { id: "hy1", task: "Çəngəl/kanca yağlama", freq: "monthly" },
      { id: "hy2", task: "Motor kayışı gərilmə yoxlaması", freq: "monthly" },
      { id: "hy3", task: "Güvənlik qapağı sensör testi", freq: "monthly", critical: true },
      { id: "hy4", task: "Redüktör yağ səviyyəsi", freq: "quarterly" },
      { id: "hy5", task: "Redüktör yağ dəyişdirmə", freq: "annual" },
    ],
  },
  {
    id: "hamur-acma",
    name: "Hamur Açma Maşını",
    category: "Hamur / Pizza",
    icon: "📏",
    maintenance: [
      { id: "ha1", task: "Vallar arası boşluq yoxlaması", freq: "weekly" },
      { id: "ha2", task: "Val yataqlarının yağlanması", freq: "monthly" },
      { id: "ha3", task: "Güvənlik düyməsi testi", freq: "monthly", critical: true },
    ],
  },
  {
    id: "pizza-dilimleme",
    name: "Pizza / Ət Dilimleme Maşını",
    category: "Hamur / Pizza",
    icon: "🔪",
    maintenance: [
      { id: "pd1", task: "Bıçaq itiliyi yoxlaması", freq: "weekly" },
      { id: "pd2", task: "Dəzgah tənzimləmələri", freq: "monthly" },
      { id: "pd3", task: "Güvənlik qoruyucu yoxlaması", freq: "monthly", critical: true },
    ],
  },

  // ═══ QƏHVƏ ═══
  {
    id: "espresso-makinesi",
    name: "Espresso Makinesi",
    category: "Qəhvə",
    icon: "☕",
    maintenance: [
      { id: "em1", task: "Backflush təmizliyi (qrup kafası)", freq: "daily" },
      { id: "em2", task: "Buğ çubuğu təmizliyi", freq: "daily" },
      { id: "em3", task: "Portafiltr + səbət təmizliyi", freq: "daily" },
      { id: "em4", task: "Qrup kafası contası yoxlaması", freq: "weekly" },
      { id: "em5", task: "Damcı tepsisi və drenaj təmizliyi", freq: "weekly" },
      { id: "em6", task: "Boiler basınc yoxlaması (8-10 bar)", freq: "monthly" },
      { id: "em7", task: "PID sıcaklıq kalibrasiyası", freq: "monthly" },
      { id: "em8", task: "Su filtresi dəyişdirmə", freq: "quarterly" },
      { id: "em9", task: "Boiler kimyasal descale", freq: "biannual" },
      { id: "em10", task: "Tam texniki servis (firma)", freq: "annual" },
    ],
  },
  {
    id: "kahve-degirmen",
    name: "Qəhvə Dəyirmanı",
    category: "Qəhvə",
    icon: "⚙️",
    maintenance: [
      { id: "kd1", task: "Doz ayarı yoxlaması (±0.5qr)", freq: "daily" },
      { id: "kd2", task: "Hopper təmizliyi (Grindz)", freq: "weekly" },
      { id: "kd3", task: "Burr aşınma yoxlaması", freq: "quarterly" },
      { id: "kd4", task: "Burr (bıçaq) dəyişdirmə", freq: "annual" },
    ],
  },

  // ═══ SOYUTMA ═══
  {
    id: "walkin-soyuducu",
    name: "Walk-in Soyuducu",
    category: "Soyutma",
    icon: "🧊",
    maintenance: [
      { id: "ws1", task: "Temperatur göstəricisi yoxlaması (0-4°C)", freq: "daily", critical: true },
      { id: "ws2", task: "Defrost və buzlanma yoxlaması", freq: "weekly" },
      { id: "ws3", task: "Qapı rezinlərinin yoxlanması", freq: "monthly" },
      { id: "ws4", task: "Fan motoru yoxlama + təmizlik", freq: "monthly" },
      { id: "ws5", task: "Kondenser təmizliyi (xarici modul)", freq: "biweekly" },
      { id: "ws6", task: "Təxliyə borusu yoxlaması", freq: "monthly" },
      { id: "ws7", task: "Qapı petlələri yağlama + isidici yoxlama", freq: "monthly" },
      { id: "ws8", task: "Daxili kilid mexanizmi testi", freq: "quarterly", critical: true },
    ],
  },
  {
    id: "derin-dondurucu",
    name: "Dərin Dondurucu",
    category: "Soyutma",
    icon: "❄️",
    maintenance: [
      { id: "dd1", task: "Temperatur yoxlaması (-18°C və aşağı)", freq: "daily", critical: true },
      { id: "dd2", task: "Defrost yoxlaması", freq: "weekly" },
      { id: "dd3", task: "Kondenser təmizliyi", freq: "biweekly" },
      { id: "dd4", task: "Qapı rezinləri + petlə yoxlama", freq: "monthly" },
      { id: "dd5", task: "Fan motoru", freq: "monthly" },
    ],
  },
  {
    id: "vitrin-soyuducu",
    name: "Vitrin Soyuducu",
    category: "Soyutma",
    icon: "🗄️",
    maintenance: [
      { id: "vs1", task: "Temperatur yoxlaması", freq: "daily", critical: true },
      { id: "vs2", task: "İşıqlandırma yoxlaması", freq: "biweekly" },
      { id: "vs3", task: "Kondenser təmizliyi", freq: "biweekly" },
      { id: "vs4", task: "Qapı rezini", freq: "monthly" },
    ],
  },
  {
    id: "buz-makinesi",
    name: "Buz Makinesi",
    category: "Soyutma",
    icon: "🧊",
    maintenance: [
      { id: "bm1", task: "Buz keyfiyyəti yoxlaması (şəffaflıq, qoxu)", freq: "daily" },
      { id: "bm2", task: "Kondenser təmizliyi", freq: "biweekly" },
      { id: "bm3", task: "Su filtresi dəyişdirmə", freq: "quarterly" },
      { id: "bm4", task: "Kimyasal dezenfeksiya (NSF/ANSI 12)", freq: "quarterly", critical: true },
      { id: "bm5", task: "Tam buğ təmizliyi", freq: "biannual" },
    ],
  },

  // ═══ KLİMA / HVAC ═══
  {
    id: "klima-kaset",
    name: "Klima — Kaset Tipi (tavan)",
    category: "Klima / HVAC",
    icon: "❄️",
    maintenance: [
      { id: "kk1", task: "Filtr təmizliyi (salon: aylıq, mətbəx: 2 həftəlik)", freq: "biweekly" },
      { id: "kk2", task: "Drenaj xətti yoxlaması + təmizlik", freq: "monthly" },
      { id: "kk3", task: "Kanat (louvre) hərəkət testi", freq: "monthly" },
      { id: "kk4", task: "Kondenser bobini təmizliyi", freq: "quarterly" },
      { id: "kk5", task: "Refrijerant basınc ölçümü + qaz kaçaq", freq: "biannual" },
      { id: "kk6", task: "YAZ ÖNCƏSİ tam servis (firma)", freq: "annual" },
      { id: "kk7", task: "QIŞ ÖNCƏSİ isitmə modu testi", freq: "annual" },
    ],
  },
  {
    id: "klima-skaf",
    name: "Klima — Şkaf Tipi",
    category: "Klima / HVAC",
    icon: "🌡️",
    maintenance: [
      { id: "ks1", task: "Filtr təmizliyi (mətbəxdə həftəlik!)", freq: "weekly" },
      { id: "ks2", task: "Fan gövdəsi daxili təmizlik", freq: "monthly" },
      { id: "ks3", task: "Kondenser təmizliyi", freq: "quarterly" },
      { id: "ks4", task: "Tam servis (firma)", freq: "biannual" },
    ],
  },
  {
    id: "klima-split",
    name: "Klima — Split (divar tipi)",
    category: "Klima / HVAC",
    icon: "🌬️",
    maintenance: [
      { id: "ksp1", task: "Daxili filtr təmizliyi", freq: "monthly" },
      { id: "ksp2", task: "Evaporator antifungal təmizlik", freq: "quarterly" },
      { id: "ksp3", task: "Drenaj borusu təmizliyi", freq: "quarterly" },
      { id: "ksp4", task: "Xarici ünite kondenser təmizliyi", freq: "quarterly" },
      { id: "ksp5", task: "Refrijerant qaz yoxlaması (firma)", freq: "biannual" },
    ],
  },
  {
    id: "davlumbaz",
    name: "Davlumbaz + Egzost",
    category: "Klima / HVAC",
    icon: "💨",
    maintenance: [
      { id: "dv1", task: "Filtr təmizliyi", freq: "weekly" },
      { id: "dv2", task: "Fan motoru yağlama", freq: "monthly" },
      { id: "dv3", task: "Filtr dəyişdirmə", freq: "quarterly" },
      { id: "dv4", task: "Kanal təmizliyi (FİRMA — rapor məcburi)", freq: "biannual", critical: true },
      { id: "dv5", task: "Yangın söndürmə sistemi yoxlaması", freq: "biannual", critical: true },
    ],
  },

  // ═══ GAZ TƏHLÜKƏSİZLİK ═══
  {
    id: "gaz-detektoru",
    name: "Gaz Detektörü / Sensör",
    category: "Təhlükəsizlik",
    icon: "⚠️",
    maintenance: [
      { id: "gd1", task: "Bump test (sürətli yoxlama)", freq: "monthly", critical: true },
      { id: "gd2", task: "Tam kalibrasiya", freq: "biannual", critical: true },
      { id: "gd3", task: "Pil / enerji yoxlaması", freq: "monthly" },
      { id: "gd4", task: "Sensör ömrü yoxlaması (3-5 il)", freq: "annual", critical: true },
    ],
  },
  {
    id: "yangin-tupu",
    name: "Yanğın Tüpü / Balon",
    category: "Təhlükəsizlik",
    icon: "🧯",
    maintenance: [
      { id: "yt1", task: "Səviyyə göstəricisi (manometr) yoxlaması", freq: "monthly", critical: true },
      { id: "yt2", task: "Fiziki zədə / korroziya yoxlaması", freq: "monthly" },
      { id: "yt3", task: "Plomb / möhür bütövlüyü", freq: "monthly" },
      { id: "yt4", task: "Dolum tarixi yoxlaması + doldurma (FİRMA)", freq: "annual", critical: true },
      { id: "yt5", task: "Hidrostatik test (FİRMA)", freq: "annual", critical: true },
    ],
  },

  // ═══ ÜMUMİ ═══
  {
    id: "generator",
    name: "Generator",
    category: "Ümumi",
    icon: "⚡",
    maintenance: [
      { id: "gn1", task: "Yanacaq çəni səviyyə yoxlaması", freq: "weekly" },
      { id: "gn2", task: "1 dəq test işlədilməsi", freq: "weekly" },
      { id: "gn3", task: "Akumulyator enerji yoxlaması", freq: "monthly" },
      { id: "gn4", task: "Yağ + filtr dəyişdirmə", freq: "biannual" },
    ],
  },
  {
    id: "kassa-pos",
    name: "Kassa POS + Barkod Oxuyucu",
    category: "Ümumi",
    icon: "💻",
    maintenance: [
      { id: "kp1", task: "Printer qabı təmizliyi", freq: "monthly" },
      { id: "kp2", task: "Barkod oxuyucu linza təmizliyi", freq: "weekly" },
      { id: "kp3", task: "Kabel bağlantı yoxlaması", freq: "quarterly" },
    ],
  },
  {
    id: "qabyuyan",
    name: "Qabyuyan Maşın",
    category: "Ümumi",
    icon: "🫧",
    maintenance: [
      { id: "qy1", task: "İşləyiş yoxlaması + su temperaturu", freq: "daily" },
      { id: "qy2", task: "Süzgəc təmizliyi", freq: "daily" },
      { id: "qy3", task: "Deterjan dozaj yoxlaması", freq: "weekly" },
      { id: "qy4", task: "Durulanma temperaturu yoxlaması (82°C+)", freq: "weekly", critical: true },
      { id: "qy5", task: "Limescale təmizliyi", freq: "monthly" },
    ],
  },
  {
    id: "terazi",
    name: "Tərəzi / Qapan",
    category: "Ümumi",
    icon: "⚖️",
    maintenance: [
      { id: "tr1", task: "Kalibrasiya yoxlaması (bilinen çəki ilə)", freq: "weekly" },
      { id: "tr2", task: "Təmizlik", freq: "biweekly" },
      { id: "tr3", task: "Pil dəyişdirmə", freq: "quarterly" },
    ],
  },
];

/** Xarici firma xidmətləri — ekipman deyil, amma takibi eyni moduldadır */
export interface ExternalService {
  id: string;
  name: string;
  icon: string;
  freq: MaintenanceFreq;
  requiresCertificate: boolean;
  critical: boolean;
  description: string;
}

export const EXTERNAL_SERVICES: ExternalService[] = [
  { id: "dezenfeksiya", name: "Dezenfeksiya", icon: "🦠", freq: "monthly", requiresCertificate: true, critical: true, description: "Aylıq dezenfeksiya — firma sertifikatı məcburi" },
  { id: "ilaclama", name: "İlaçlama / Haşərə Kontrolü", icon: "🪳", freq: "monthly", requiresCertificate: true, critical: true, description: "Aylıq ilaçlama — istifadə olunan preparat qeyd olunmalı" },
  { id: "kanal-temizlik", name: "Havalandırma Kanal Təmizliyi", icon: "💨", freq: "biannual", requiresCertificate: true, critical: true, description: "Firma raporu + əvvəl/sonra foto MƏCBURİ (HACCP)" },
  { id: "yangin-sistem", name: "Yangın Söndürmə Sistemi", icon: "🔥", freq: "annual", requiresCertificate: true, critical: true, description: "İllik firma yoxlaması + rapor" },
  { id: "gaz-tesisati", name: "Qaz Təsisatı Yoxlaması", icon: "⚠️", freq: "annual", requiresCertificate: true, critical: true, description: "Lisenziyalı firma raporu MƏCBURİ" },
  { id: "su-analizi", name: "Su Analizi", icon: "💧", freq: "biannual", requiresCertificate: true, critical: false, description: "Laboratoriya nəticəsi" },
  { id: "klima-servis", name: "Klima Tam Servis (YAZ+QIŞ)", icon: "❄️", freq: "biannual", requiresCertificate: false, critical: false, description: "Yaz öncəsi (Aprel) + qış öncəsi (Oktyabr) tam texniki servis" },
];
