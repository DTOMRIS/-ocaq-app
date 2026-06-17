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
        label: "Dönər ocaqları təmizləndi (ət dönər + toyuq dönər ayrı-ayrı)",
        requiresPhoto: true,
      },
      {
        id: "s17b",
        label: "Ət dönər — çiy baton taxıldı, çəkisi qeyd edildi (kq)",
        temperatureField: true,
      },
      {
        id: "s17c",
        label: "Toyuq dönər — çiy baton taxıldı, çəkisi qeyd edildi (kq)",
        temperatureField: true,
      },
      {
        id: "s17d",
        label: "Dünəndən qalan bişmiş dönər yoxlanıldı (SİT + temperatur)",
      },
      { id: "s18", label: "Bütün qabların təmizlənməsi" },
      { id: "s19", label: "Fritözün (qızartma tavasının) təmizlənməsi" },
      {
        id: "s20",
        label: "Dönər ocaqları açıldı — ət ocağı temperatur düzgün",
        temperatureField: true,
      },
      {
        id: "s20b",
        label: "Dönər ocaqları açıldı — toyuq ocağı temperatur düzgün",
        temperatureField: true,
      },
    ],
  },
  // ═══ ŞAURMA BÖLMƏSİ (Günel tələbi) ═══
  {
    id: "shaurma-section",
    title: "Şaurma Bölməsi",
    icon: "🌯",
    items: [
      { id: "sh1", label: "Ət dönər ocağı yandırıldı, temperatur yoxlandı", temperatureField: true },
      { id: "sh2", label: "Toyuq dönər ocağı yandırıldı, temperatur yoxlandı", temperatureField: true },
      { id: "sh3", label: "Lavaş / pita / çörək stoku yoxlandı, yetərli miqdardadır" },
      { id: "sh4", label: "Souslar hazırlanıb — sarımsaqlı, acılı, ərəb, ketçup" },
      { id: "sh5", label: "Doğranmış tərəvəzlər hazırdır — xıyar, pomidor, soğan, göyərti" },
      {
        id: "sh6",
        label: "ETİKETLƏMƏ: Mayonez, pomidor, xıyar — açılma tarixi + saatı yazılıb",
        requiresPhoto: true,
      },
      {
        id: "sh7",
        label: "ETİKETLƏMƏ: Kartof fri (hazırlanmış) — vaxt etiketi yapışdırılıb",
      },
      { id: "sh8", label: "Şaurma sarma stansiyası təmiz və təşkil olunub" },
      { id: "sh9", label: "Bıçaqlar itidir, doğrama taxtaları təmiz (rəng kodlu)" },
      { id: "sh10", label: "Qablaşdırma materialı (folqa, kağız, qutu) tam stokda" },
    ],
  },

  // ═══ FIRIN BÖLMƏSİ (Günel tələbi) ═══
  {
    id: "firin-section",
    title: "Fırın Bölməsi (Pizza / Lahmacun / Pide)",
    icon: "🍕",
    items: [
      { id: "fr1", label: "Pizza fırını yandırıldı, temperatur düzgün (250-350°C)", temperatureField: true },
      { id: "fr2", label: "Fırın daşı / kayrak təmizlənib" },
      { id: "fr3", label: "Hamur hazırdır, porsiyalanıb (dünəndən mayalanmış yoxlanıb)" },
      {
        id: "fr4",
        label: "ETİKETLƏMƏ: Pizza toppingləri — pendir, zeytin, göbələk, bibər, sosis — açılma tarixi + saatı",
        requiresPhoto: true,
      },
      {
        id: "fr5",
        label: "ETİKETLƏMƏ: Lahmacun harcı tezgaha qoyuldu — etiketdə tarix + saat yazılıb",
        requiresPhoto: true,
      },
      { id: "fr6", label: "Sous qabları (pizza sousu, ketçup) dolu və təmizdir" },
      { id: "fr7", label: "Pizza qutuları / lahmacun kağızları stokda" },
      { id: "fr8", label: "Pizza bıçağı / dilimleme aləti təmiz və itidi" },
    ],
  },

  // ═══ MƏTBƏX BÖLMƏSİ (Günel tələbi) ═══
  {
    id: "metbex-section",
    title: "Mətbəx Bölməsi (İsti / Soyuq)",
    icon: "👨‍🍳",
    items: [
      { id: "mt1", label: "Bütün iş səthləri təmiz və dezinfeksiya olunub" },
      { id: "mt2", label: "Soyuducu temperaturu yoxlanıb (0-4°C)", temperatureField: true },
      { id: "mt3", label: "Dondurucu temperaturu yoxlanıb (-18°C və aşağı)", temperatureField: true },
      { id: "mt4", label: "Mise en place tamamlanıb — bütün hazırlıqlar bitib" },
      {
        id: "mt5",
        label: "ETİKETLƏMƏ: Bütün açıq məhsullar (sous, ət, tərəvəz) — tarix + saat etiketi var",
        requiresPhoto: true,
      },
      { id: "mt6", label: "FIFO qaydası tətbiq olunub — köhnə məhsullar öndə" },
      { id: "mt7", label: "SİT yoxlaması — vaxtı keçmiş məhsul tapılmadı" },
      { id: "mt8", label: "Əl yuma stansiyası işləyir, sabun + kağız havlu var" },
      { id: "mt9", label: "Rəng kodlu doğrama taxtaları düzgün istifadə olunur" },
      { id: "mt10", label: "Tullantı qabları boşaldılıb, yerinə təmiz torba qoyulub" },
    ],
  },

  // ═══ BAR BÖLMƏSİ (Günel tələbi) ═══
  {
    id: "bar-section",
    title: "Bar Bölməsi (İçki / Qəhvə / Desert)",
    icon: "🥤",
    items: [
      { id: "br1", label: "İçki dolabı temperaturu yoxlandı (2-8°C)", temperatureField: true },
      { id: "br2", label: "İçki stoku yoxlandı — su, kola, çay, limonad" },
      { id: "br3", label: "Kola/premix aparatı işləyir, nozzle təmizdir" },
      { id: "br4", label: "CO₂ balon təzyiqi yoxlandı" },
      { id: "br5", label: "Espresso makinesi hazırdır, qrup kafası isınıb" },
      { id: "br6", label: "Süd soyuducusu yoxlandı — temperatur 2-4°C, SİT yaxşıdır", temperatureField: true },
      { id: "br7", label: "Çay dəmləmə stansiyası hazırdır (stəkan, qaşıq, şəkər)" },
      { id: "br8", label: "Dondurma dolabı yoxlandı (-14/-18°C), SİT yaxşıdır", temperatureField: true },
      { id: "br9", label: "Bar stansiyası təmiz, damcı tepsisi boşaldılıb" },
      { id: "br10", label: "Stəkan, fincan, qaşıq ləvazimatı tamdır" },
    ],
  },

  // ═══ ETİKETLƏMƏ — 16:00 YENİLƏMƏ (Günel tələbi) ═══
  {
    id: "labeling-refresh",
    title: "⏰ 16:00 Etiketləmə Yeniləmə & Təmizlik",
    icon: "🏷️",
    items: [
      {
        id: "lb1",
        label: "Bütün açıq tərəvəzlər (mayonez, pomidor, xıyar) TƏMİZLƏNDİ — köhnələr atıldı",
        requiresPhoto: true,
      },
      {
        id: "lb2",
        label: "Yeni tərəvəzlər doğranıb qoyuldu — YENİ ETİKET (tarix + saat: 16:00) yapışdırıldı",
        requiresPhoto: true,
      },
      {
        id: "lb3",
        label: "Pizza toppingləri TƏMİZLƏNDİ — köhnələr atıldı, yeniləri qoyuldu + ETİKET",
        requiresPhoto: true,
      },
      {
        id: "lb4",
        label: "Lahmacun harcı TƏMİZLƏNDİ — yeni harc qoyuldu + ETİKET",
        requiresPhoto: true,
      },
      {
        id: "lb5",
        label: "Kartof fri stansiyası təmizləndi, yeni partiya hazırlandı",
      },
      {
        id: "lb6",
        label: "Sous qabları (mayonez, ketçup, sarımsaqlı) yeniləndı + ETİKET",
      },
      {
        id: "lb7",
        label: "İş səthləri tam dezinfeksiya olundu (16:00 ara təmizlik)",
      },
      {
        id: "lb8",
        label: "Soyuducu temperaturu 16:00 yoxlaması (HACCP jurnalına yazıldı)",
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
