/**
 * MƏK F 08 — Gün Başladıqda, Növbə Dəyişdikdə və Gün Bitdikdə Ediləcəklər
 * Mənbə: Shaurma No.1, Rev.01, 02.03.2017
 * Seed data — gələcəkdə DB-dən gələcək.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  requiresPhoto?: boolean;
  temperatureField?: boolean; // sıcaklık girişi gereken maddeler
}

export interface ChecklistSection {
  id: string;
  title: string;
  icon: string; // emoji — sonra lucide icon olacak
  items: ChecklistItem[];
}

export const MEK_F08_SECTIONS: ChecklistSection[] = [
  {
    id: "personal",
    title: "Şəxsi Görünüş — Gigiyena və Təhlükəsizlik",
    icon: "👤",
    items: [
      {
        id: "p1",
        label:
          "Uniformanın standartlarda, ütülü, təmiz və adlığın taxılı olması",
      },
      {
        id: "p2",
        label:
          "Şəxsi görünüş: bijuteriyasız, dırnaqların təmiz və qısa, saçların təmiz və yığılmış olması",
      },
      {
        id: "p3",
        label:
          'Əllər "əl yuma proseduru"na əsasən yuyulmuş və dezinfeksiya edilmiş olması',
        requiresPhoto: true,
      },
      {
        id: "p4",
        label:
          "Filial açılış saatına qədər giriş və arxa qapıların kilidli saxlanılması",
      },
      {
        id: "p5",
        label:
          "Restoran müştəriyə bağlandıqdan sonra qapıların kilidli saxlanılması",
      },
    ],
  },
  {
    id: "general",
    title: "Filial Ümumi",
    icon: "🏪",
    items: [
      {
        id: "g1",
        label:
          "Filial işıqlandırmalarının müəyyən edilmiş plana əsasən yandırılması/söndürülməsi",
      },
      {
        id: "g2",
        label:
          "Termostat yoxlaması, hava sovurucuların yoxlanması və mərhələli qoşulması/söndürülməsi",
        temperatureField: true,
      },
      {
        id: "g3",
        label: "Hava pərdəsi və kondisionerlərin qoşulması/söndürülməsi",
      },
      { id: "g4", label: "LCD ekranın qoşulması/söndürülməsi" },
    ],
  },
  {
    id: "cleaning",
    title: "Filial Təmizlik və Gigiyena",
    icon: "🧹",
    items: [
      {
        id: "c1",
        label: "Filial xaricinin təmizlənməsi və səliqəsinin yoxlanması",
        requiresPhoto: true,
      },
      { id: "c2", label: "Filial yerlərinin təmizlənməsi və yoxlanması" },
      {
        id: "c3",
        label:
          "Zibil və itki vedrələrinin hazırlanması və müəyyən edilmiş yerlərə yerləşdirilməsi",
      },
      {
        id: "c4",
        label:
          "Bütün çirkli qabların yuyulması (məcməyilər, tavalar, səbətlər, konteynerlər)",
      },
      {
        id: "c5",
        label:
          "Salat, şirniyyat və içki dolablarının təmizliyinin yoxlanması",
        requiresPhoto: true,
      },
      {
        id: "c6",
        label: "Dəzgah üstlərinin və altlarının təmizliyinin yoxlanması",
      },
      {
        id: "c7",
        label: "Masaların sabitliyinin yoxlanması — sallanan masa varsa tənzimləmə/təmir",
      },
      {
        id: "c7b",
        label: "Masa üstü ləvazimat: duz, bibər, salfetlik, diş çöpü qabları təmiz və doludur",
      },
      {
        id: "c7c",
        label: "Masa üstü sous/yağ qablarının təmizliyi və doluluğu (ketçup, mayonez, sirke)",
      },
      {
        id: "c8",
        label: "Stulların təmizliyi, düzgün yerləşdirilməsi, sallanan/sınıq stul yoxdur",
      },
      {
        id: "c9",
        label: "Dekorların və işıqlandırmaların təmizliyinin yoxlanması",
      },
      { id: "c10", label: "Aynaların təmizliyinin yoxlanması" },
      { id: "c11", label: "Zibil qutularının təmizliyi, torba dəyişdirilməsi" },
      {
        id: "c12",
        label: "Tualetlər — sabun, kağız havlu, əl quruducu işləyir, qoxu yoxdur",
        requiresPhoto: true,
      },
      {
        id: "c12b",
        label: "Tualet Təmizlik Kontrol Siyahısı asılıb və saatlıq imzalanır",
      },
      {
        id: "c12c",
        label: "Tualet döşəməsi quru, sifonlar işləyir, işıqlar tam yanır",
      },
      { id: "c13", label: "Kül qablarının təmizliyinin yoxlanması" },
    ],
  },
  {
    id: "service",
    title: "Servis Bölgəsi",
    icon: "🍽️",
    items: [
      {
        id: "s1",
        label:
          "Servis ləvazimatlarının tamamlanması (duz, bibər, salfet, diş çöpü, kolonya, paket)",
      },
      {
        id: "s2",
        label:
          "İtki olacaq məhsulların qeyd edilməsi və itki torbasına qoyulması",
      },
      {
        id: "s3",
        label: "Kassanın açılması, işlədiyinin və rulonun yoxlanması",
      },
      { id: "s4", label: "Xırda pul yoxlanması" },
      {
        id: "s5",
        label: "Yazar kassa və POS cihazlarının rulolarının yoxlanması",
      },
      { id: "s6", label: "Tərəzinin qoşulması/söndürülməsi (var isə)" },
      {
        id: "s7",
        label:
          "Kassa bölgə yoxlaması: vitrinlərin və nümayiş modullarının yoxlanması",
        requiresPhoto: true,
      },
      {
        id: "s8",
        label:
          "Qablaşdırmanın (qutu, paket, islaq salfet) əksik olub-olmadığının yoxlanması",
      },
      {
        id: "s9",
        label:
          "Strechlənmiş məhsulların strechlərinin çıxarılması və yoxlanması",
      },
      {
        id: "s10",
        label:
          "Məhsulların müəyyən edilmiş yerlərinə yerləşdirilməsi və yoxlanması",
      },
      { id: "s11", label: "Məhsul etiketlərinin yerləşdirilməsi və yoxlanması" },
      {
        id: "s12",
        label: "İçki dolabının yoxlanması və içkilərin tamamlanması",
      },
      { id: "s13", label: "Paketli məhsulların SİT (son istifadə tarixi) yoxlaması" },
      {
        id: "s14",
        label: "Fritözün qoşulması və temperaturunun 170°C olması",
        temperatureField: true,
      },
      {
        id: "s15",
        label: "Tosterin qoşulması və dərəcəsinin yoxlanması",
        temperatureField: true,
      },
      { id: "s16", label: "İçki dolabının təmizlənməsi və yoxlanması" },
      {
        id: "s17",
        label: "Dönər ocaqlarının təmizlənməsi",
        requiresPhoto: true,
      },
      { id: "s18", label: "Bütün qabların təmizlənməsi" },
      { id: "s19", label: "Fritözün (qızartma tavasının) təmizlənməsi" },
      {
        id: "s20",
        label:
          "Dönər ocaqlarını açın və temperaturunun düzgün sazlandığından əmin olun",
        temperatureField: true,
      },
    ],
  },
  {
    id: "coffee",
    title: "Qəhvə Stansiyası",
    icon: "☕",
    items: [
      {
        id: "cf1",
        label: "Espresso makinesi yandırılıb, qrup kafası isınıb (15 dəq)",
      },
      {
        id: "cf2",
        label: "Backflush təmizliyi aparılıb (əvvəlki vardiyadan)",
      },
      {
        id: "cf3",
        label: "Portafiltr + səbət təmizdir, qalıq yoxdur",
      },
      {
        id: "cf4",
        label: "Buğ çubuğu (steam wand) təmizlənib, süd qalığı yoxdur",
      },
      {
        id: "cf5",
        label: "Qəhvə dəyirmanı — doz yoxlaması (±0.5qr)",
      },
      {
        id: "cf6",
        label: "Dəyirman hopper təmizdir, köhnə dən qalığı yoxdur",
      },
      {
        id: "cf7",
        label: "Süd soyuducusu yoxlanıb — süd temperaturu 2-4°C, SİT yaxşıdır",
        temperatureField: true,
      },
      {
        id: "cf8",
        label: "Qəhvə stansiyası ətrafı təmiz, damcı tepsisi boşaldılıb",
      },
      {
        id: "cf9",
        label: "Stəkan, qaşıq, stirrer, şəkər, süd köpüyü ləvazimatı tamdır",
      },
    ],
  },
  {
    id: "icecream",
    title: "Dondurma Dolabı + Soyuq İçkilər",
    icon: "🍦",
    items: [
      {
        id: "ic1",
        label: "Dondurma dolabı temperaturu yoxlanıb (-14/-18°C)",
        temperatureField: true,
      },
      {
        id: "ic2",
        label: "Dondurma məhsullarının SİT (son istifadə tarixi) yoxlanıb",
      },
      {
        id: "ic3",
        label: "Dolabın şüşəsi təmizdir, buxar / buz yığılması yoxdur",
      },
      {
        id: "ic4",
        label: "Məhsullar düzgün sıralanıb, etiketlər görünür",
      },
      {
        id: "ic5",
        label: "İçki dolabı temperaturu yoxlanıb (2-8°C), içkilər tamamlanıb",
        temperatureField: true,
      },
      {
        id: "ic6",
        label: "Kola/premix aparatı — nozzle təmizdir, sirop BIB səviyyəsi yaxşıdır",
      },
      {
        id: "ic7",
        label: "CO₂ balon təzyiq yoxlanıb (manometr)",
      },
    ],
  },
  {
    id: "equipment-check",
    title: "Avadanlıq Gündəlik Yoxlama",
    icon: "🔧",
    items: [
      {
        id: "eq1",
        label: "Walk-in soyuducu temperatur (0-4°C) — HACCP jurnalına yazıldı",
        temperatureField: true,
      },
      {
        id: "eq2",
        label: "Dondurucu temperatur (-18°C) — HACCP jurnalına yazıldı",
        temperatureField: true,
      },
      {
        id: "eq3",
        label: "Posuda yuyucu maşın — su temperaturu (yaxalama ≥82°C)",
        temperatureField: true,
      },
      {
        id: "eq4",
        label: "Əl yuma stansiyası — sabun, kağız, isti su (≥42°C) mövcuddur",
      },
      {
        id: "eq5",
        label: "Dezinfeksiya stansiyası — konsentrasiya yoxlanıb (ppm test şeridi)",
      },
      {
        id: "eq6",
        label: "Davlumbaz / ventilyasiya işləyir, normal səs çıxarır",
      },
      {
        id: "eq7",
        label: "Qaz detektörü göstəricisi yaşıl (normal) — qırmızıdırsa DƏRHAL bildiriş!",
      },
      {
        id: "eq8",
        label: "Yanğın tüpü yerindədir, manometr yaşıl zonada",
      },
      {
        id: "eq9",
        label: "Müşahidə kameraları işləyir, görüntü qeyd edir",
      },
    ],
  },
];
