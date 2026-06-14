/**
 * MƏK F 08 — Gün Başladıqda, Növbə Dəyişdikdə və Gün Bitdikdə Ediləcəklər
 * Mənbə: Əjdaha MMC, Rev.01, 02.03.2017
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
        label:
          "Masaların və bibər, duz qabı, yağ təmizliyinin, səliqəsinin yoxlanması",
      },
      {
        id: "c8",
        label:
          "Stulların təmizliyinin, düzgün yerləşdirilmiş olmasının yoxlanması",
      },
      {
        id: "c9",
        label: "Dekorların və işıqlandırmaların təmizliyinin yoxlanması",
      },
      { id: "c10", label: "Aynaların təmizliyinin yoxlanması" },
      { id: "c11", label: "Zibil qutularının təmizliyinin yoxlanması" },
      {
        id: "c12",
        label:
          'Tualetlərin "Tualet Təmizlik Nəzarət və Təqib" formu ilə təmizlənməsi',
        requiresPhoto: true,
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
];
