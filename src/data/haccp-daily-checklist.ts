/**
 * HACCP Günlük Qida Təhlükəsizliyi Checklist-i
 * Mənbə: Food Safety Manual 2025 v2 + MƏK F 03/F 07 + McDonald's DPSC
 * Hər gün sabah + axşam vardiyasında doldurulmalı
 */

export interface HaccpItem {
  id: string;
  label: string;
  type: "check" | "temperature" | "time" | "note";
  target?: string;       // hədəf dəyər (məs: "0-4°C")
  critical: boolean;     // CCP — Critical Control Point
  requiresPhoto?: boolean;
}

export interface HaccpSection {
  id: string;
  title: string;
  icon: string;
  when: "opening" | "ongoing" | "closing" | "both";
  items: HaccpItem[];
}

export const HACCP_SECTIONS: HaccpSection[] = [
  {
    id: "thermometer",
    title: "Termometr Kalibrasiyası",
    icon: "🌡️",
    when: "opening",
    items: [
      { id: "th1", label: "Pyrometr buz-su testi keçirildi (0°C ±0.5°C)", type: "temperature", target: "0°C", critical: true },
      { id: "th2", label: "Pyrometr təmiz və dezinfeksiya edilib", type: "check", critical: false },
    ],
  },
  {
    id: "cold-storage",
    title: "Soyuq Saxlama Temperaturları",
    icon: "❄️",
    when: "both",
    items: [
      { id: "cs1", label: "Walk-in soyuducu temperaturu", type: "temperature", target: "0-4°C", critical: true },
      { id: "cs2", label: "Dərin dondurucu temperaturu", type: "temperature", target: "-18°C və aşağı", critical: true },
      { id: "cs3", label: "Vitrin soyuducu temperaturu", type: "temperature", target: "0-4°C", critical: true },
      { id: "cs4", label: "Pizza tezgahı (soyuducu üst)", type: "temperature", target: "0-4°C", critical: true },
      { id: "cs5", label: "Dəzgah altı dolablar temperaturu", type: "temperature", target: "0-4°C", critical: true },
      { id: "cs6", label: "Dondurma dolabı temperaturu", type: "temperature", target: "-14/-18°C", critical: true },
    ],
  },
  {
    id: "hot-holding",
    title: "İsti Saxlama Temperaturları",
    icon: "🔥",
    when: "ongoing",
    items: [
      { id: "hh1", label: "Dönər ət daxili temperatur", type: "temperature", target: "63°C+", critical: true },
      { id: "hh2", label: "Şorba / sos isitmə temperaturu", type: "temperature", target: "63°C+", critical: true },
      { id: "hh3", label: "Benmari su temperaturu", type: "temperature", target: "80°C+", critical: false },
      { id: "hh4", label: "Hazır yeməklərin saxlama müddəti (max 4 saat)", type: "time", target: "≤4 saat", critical: true },
      { id: "hh5", label: "Fritöz yağ temperaturu", type: "temperature", target: "170-180°C", critical: false },
    ],
  },
  {
    id: "sit-check",
    title: "Son İstifadə Tarixi (SİT) Yoxlaması",
    icon: "📅",
    when: "opening",
    items: [
      { id: "st1", label: "Soyuducudakı bütün məhsulların SİT yoxlandı", type: "check", critical: true },
      { id: "st2", label: "Dondurucudakı məhsulların SİT yoxlandı", type: "check", critical: true },
      { id: "st3", label: "Açıq məhsulların üzərində tarix etiketi var", type: "check", critical: true },
      { id: "st4", label: "Vaxtı keçmiş məhsul tapıldı → utilizasiya edildi", type: "note", critical: true, requiresPhoto: true },
      { id: "st5", label: "FİFO (First In First Out) qaydası tətbiq olunur", type: "check", critical: true },
    ],
  },
  {
    id: "hand-hygiene",
    title: "Əl Gigiyenası + Şəxsi Gigiyena",
    icon: "🧼",
    when: "opening",
    items: [
      { id: "hg1", label: "Əl yuma stansiyası işləyir (sabun, isti su, qurutma)", type: "check", critical: true },
      { id: "hg2", label: "Dezinfeksiya məhlulu hazırlanıb (ppm yoxlandı)", type: "check", critical: true },
      { id: "hg3", label: "Bütün personel əllərini yuyub vardiyaya başlayıb", type: "check", critical: true },
      { id: "hg4", label: "Personel — dırnaqlar qısa, saç yığılı, bijuteriya yox", type: "check", critical: false },
      { id: "hg5", label: "Əlcəklər mövcuddur (çiy ət üçün mavi əlcək)", type: "check", critical: true },
    ],
  },
  {
    id: "cross-contamination",
    title: "Çarpaz Kontaminasiya Önləmə",
    icon: "⚠️",
    when: "both",
    items: [
      { id: "cc1", label: "Çiy ət ayrı saxlanılır (alt rəfdə, qapalı qabda)", type: "check", critical: true },
      { id: "cc2", label: "Rəng kodlu doğrama taxtaları istifadə olunur", type: "check", critical: true },
      { id: "cc3", label: "Çiy və bişmiş məhsullar üçün ayrı avadanlıq", type: "check", critical: true },
      { id: "cc4", label: "Allergen məhsullar ayrı saxlanılır + işarələnib", type: "check", critical: true },
      { id: "cc5", label: "Təmizlik bezi rəng kodu doğrudur (mətbəx/tualet fərqli)", type: "check", critical: false },
    ],
  },
  {
    id: "cooking-temp",
    title: "Pişirmə Temperaturları",
    icon: "🍳",
    when: "ongoing",
    items: [
      { id: "ct1", label: "Toyuq daxili temperatur (74°C+)", type: "temperature", target: "74°C+", critical: true },
      { id: "ct2", label: "Mal əti daxili temperatur (72°C+ / 63°C medium)", type: "temperature", target: "72°C+", critical: true },
      { id: "ct3", label: "Balıq daxili temperatur (63°C+)", type: "temperature", target: "63°C+", critical: true },
      { id: "ct4", label: "Pizza fırın temperaturu (düzgün sazlanıb)", type: "temperature", target: "250-350°C", critical: false },
      { id: "ct5", label: "Yenidən isidilən yemək 74°C-yə çatdırılıb (2 saat içində)", type: "temperature", target: "74°C", critical: true },
    ],
  },
  {
    id: "receiving",
    title: "Məhsul Qəbul Yoxlaması",
    icon: "📦",
    when: "ongoing",
    items: [
      { id: "rc1", label: "Gələn məhsulun temperaturu yoxlandı", type: "temperature", target: "Soyuq ≤4°C, Dondurulmuş ≤-18°C", critical: true },
      { id: "rc2", label: "Qablaşdırma bütövlüyü yoxlandı (zədəsiz)", type: "check", critical: true },
      { id: "rc3", label: "SİT yoxlandı (qəbul zamanı)", type: "check", critical: true },
      { id: "rc4", label: "Tədarükçü sertifikatı / qaimə alındı", type: "check", critical: false },
      { id: "rc5", label: "Məhsul dərhal müvafiq saxlama yerinə qoyuldu", type: "check", critical: true },
    ],
  },
  {
    id: "cleaning-sanitation",
    title: "Təmizlik və Sanitasiya",
    icon: "🧹",
    when: "closing",
    items: [
      { id: "cl1", label: "Bütün iş səthlərinin təmizliyi və dezinfeksiyası", type: "check", critical: true },
      { id: "cl2", label: "Avadanlıqların sökülüb yuyulması (doğrama, dilimleme)", type: "check", critical: true },
      { id: "cl3", label: "Yer təmizliyi (mətbəx + salon)", type: "check", critical: false },
      { id: "cl4", label: "Zibil konteynerləri boşaldılıb + təmizlənib", type: "check", critical: false },
      { id: "cl5", label: "Tualetlər təmizlənib + ləvazimat tamamlanıb", type: "check", critical: false, requiresPhoto: true },
      { id: "cl6", label: "Dezinfeksiya məhlulu konsentrasiyası son yoxlama", type: "check", critical: true },
    ],
  },
  {
    id: "water-ice",
    title: "Su və Buz Keyfiyyəti",
    icon: "💧",
    when: "opening",
    items: [
      { id: "wi1", label: "Su filtri işləyir (axın normal)", type: "check", critical: false },
      { id: "wi2", label: "Buz keyfiyyəti yoxlandı (şəffaf, qoxusuz)", type: "check", critical: true },
      { id: "wi3", label: "Buz makinesi daxili təmizdir", type: "check", critical: true },
      { id: "wi4", label: "Buz kürəyi təmiz və dezinfeksiya edilib", type: "check", critical: true },
    ],
  },
  {
    id: "pest-control",
    title: "Zərərverici Kontrolü",
    icon: "🪳",
    when: "opening",
    items: [
      { id: "pc1", label: "Zərərverici əlaməti yoxdur (görmə, iz, ifrazat)", type: "check", critical: true },
      { id: "pc2", label: "Qapı və pəncərələr düzgün bağlanır (sızdırmazlıq)", type: "check", critical: false },
      { id: "pc3", label: "Zibil sahəsi təmiz və qapalı", type: "check", critical: false },
    ],
  },
];
