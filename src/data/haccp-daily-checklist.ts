/**
 * QİDA TƏHLÜKƏSİZLİYİ — Günlük Food Safety Checklist
 * Mənbə: McDonald's Food Safety Manual v1.3 (April 2025) + MƏK F 03/F 07
 * Spesifik temperatur/vaxt dəyərləri manual-dan çıxarılıb.
 * HACCP CCP nöqtələri ayrıca işarələnib.
 */

export interface HaccpItem {
  id: string;
  label: string;
  type: "check" | "temperature" | "time" | "note";
  target?: string;
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
  // ═══ 1. TERMOMETR KALİBRASİYA ═══
  {
    id: "thermometer",
    title: "Termometr / Pyrometr Kalibrasiyası",
    icon: "🌡️",
    when: "opening",
    items: [
      { id: "th1", label: "Pyrometr buz-su testi (0°C ±0.5°C)", type: "temperature", target: "0°C ±0.5", critical: true },
      { id: "th2", label: "İğnə prob steril prob silgiylə silinib", type: "check", critical: false },
      { id: "th3", label: "Ehtiyat batareya və prob mövcuddur", type: "check", critical: false },
    ],
  },

  // ═══ 2. SOYUQ SAXLAMA ═══
  {
    id: "cold-storage",
    title: "Soyuq Saxlama Temperaturları",
    icon: "❄️",
    when: "both",
    items: [
      { id: "cs1", label: "Walk-in soyuducu", type: "temperature", target: "2-4°C (max 4°C)", critical: true },
      { id: "cs2", label: "Əsas dondurucu", type: "temperature", target: "-18°C və aşağı", critical: true },
      { id: "cs3", label: "İkinci dondurucu (varsa)", type: "temperature", target: "-15°C və aşağı", critical: true },
      { id: "cs4", label: "Vitrin soyuducu", type: "temperature", target: "2-4°C", critical: true },
      { id: "cs5", label: "Pizza tezgahı (soyuducu üst)", type: "temperature", target: "2-4°C", critical: true },
      { id: "cs6", label: "Dəzgah altı dolablar", type: "temperature", target: "2-4°C", critical: true },
      { id: "cs7", label: "Dondurma dolabı", type: "temperature", target: "-14/-18°C", critical: true },
      { id: "cs8", label: "İçki dolabı", type: "temperature", target: "2-8°C", critical: false },
    ],
  },

  // ═══ 3. PİŞİRMƏ DAXİLİ TEMPERATURLARI ═══
  {
    id: "cooking-temp",
    title: "Pişirmə — Daxili (Core) Temperaturlar",
    icon: "🍳",
    when: "ongoing",
    items: [
      { id: "ct1", label: "Mal əti / dana — daxili temperatur", type: "temperature", target: "70°C+ (minimum)", critical: true },
      { id: "ct2", label: "Toyuq / quş əti — daxili temperatur", type: "temperature", target: "74°C+ (minimum)", critical: true },
      { id: "ct3", label: "Balıq / dəniz məhsulları — daxili temperatur", type: "temperature", target: "71°C+ (minimum)", critical: true },
      { id: "ct4", label: "Donuz əti — daxili temperatur", type: "temperature", target: "70°C+ (minimum)", critical: true },
      { id: "ct5", label: "Yumurta (bişmiş) — sarısı bərk olmalı", type: "temperature", target: "70°C+ (sarısı gelled)", critical: true },
      { id: "ct6", label: "Bitki bazlı (plant-based) məhsullar", type: "temperature", target: "74°C+ (minimum)", critical: true },
      { id: "ct7", label: "Sosis — daxili temperatur", type: "temperature", target: "70°C+ (çiy əlaməti olmamalı)", critical: true },
      { id: "ct8", label: "Yenidən isidilən yemək (2 saat içində!)", type: "temperature", target: "74°C+ (2 saat ərzində)", critical: true },
      { id: "ct9", label: "Dönər ət — kəsim nöqtəsindən ölçmə", type: "temperature", target: "70°C+ (xaricdən daxilə)", critical: true },
      { id: "ct10", label: "Pizza — fırın temperaturu düzgün sazlanıb", type: "temperature", target: "250-350°C (fırın)", critical: false },
    ],
  },

  // ═══ 4. İSTİ SAXLAMA ═══
  {
    id: "hot-holding",
    title: "İsti Saxlama (Hot Holding)",
    icon: "🔥",
    when: "ongoing",
    items: [
      { id: "hh1", label: "İsti saxlama temperaturu (bütün məhsullar)", type: "temperature", target: "63°C+ (minimum)", critical: true },
      { id: "hh2", label: "Dönər ət kəsilmiş hissə", type: "temperature", target: "63°C+", critical: true },
      { id: "hh3", label: "Şorba / sos benmari", type: "temperature", target: "63°C+ (benmari 80°C+)", critical: true },
      { id: "hh4", label: "Hazır yeməklərin saxlama müddəti", type: "time", target: "MAX 4 SAAT (sonra atılmalı)", critical: true },
      { id: "hh5", label: "UHC / saxlama kabinəsi hər 4 saatda təmizlənir", type: "check", critical: true },
      { id: "hh6", label: "Fritöz yağ temperaturu", type: "temperature", target: "170-180°C", critical: false },
    ],
  },

  // ═══ 5. SİT — SON İSTİFADƏ TARİXİ ═══
  {
    id: "sit-check",
    title: "Son İstifadə Tarixi (SİT) + FIFO",
    icon: "📅",
    when: "opening",
    items: [
      { id: "st1", label: "Soyuducudakı bütün məhsulların SİT yoxlandı", type: "check", critical: true },
      { id: "st2", label: "Dondurucudakı məhsulların SİT yoxlandı", type: "check", critical: true },
      { id: "st3", label: "Açıq məhsulların üzərində tarix etiketi var", type: "check", critical: true },
      { id: "st4", label: "İkinci raf ömrü etiketləri düzgün tətbiq olunub", type: "check", critical: true },
      { id: "st5", label: "Vaxtı keçmiş məhsul tapıldı → utilizasiya", type: "note", critical: true, requiresPhoto: true },
      { id: "st6", label: "FIFO (First In First Out) qaydası tətbiq olunur", type: "check", critical: true },
      { id: "st7", label: "4-8°C arası: 24 saatlıq ikinci raf ömrü (süd/shake)", type: "check", critical: true },
      { id: "st8", label: "8°C üstü: 4 saatlıq limit (yüksək riskli)", type: "check", critical: true },
    ],
  },

  // ═══ 6. ƏL GİGİYENASI ═══
  {
    id: "hand-hygiene",
    title: "Əl Gigiyenası + Şəxsi Gigiyena",
    icon: "🧼",
    when: "both",
    items: [
      { id: "hg1", label: "Əl yuma stansiyası: sabun + isti su (42°C+) + qurutma", type: "check", critical: true },
      { id: "hg2", label: "Yarım saatlıq əl yuma sistemi qurulub (30 dəq timer)", type: "check", critical: true },
      { id: "hg3", label: "Sanitizer dispenser giriş nöqtələrində mövcuddur", type: "check", critical: true },
      { id: "hg4", label: "Bütün personel əllərini yuyub vardiyaya başlayıb", type: "check", critical: true },
      { id: "hg5", label: "Dırnaqlar qısa, təmiz, laklanmamış, saxta dırnaq YOX", type: "check", critical: false },
      { id: "hg6", label: "Yaralar su keçirməz MAVİ plasterle örtülüb", type: "check", critical: true },
      { id: "hg7", label: "Saç yığılıb (baş geyimi), minimum bəzək-düzək", type: "check", critical: false },
    ],
  },

  // ═══ 7. ÇARPAZ KONTAMİNASİYA ═══
  {
    id: "cross-contamination",
    title: "Çarpaz Kontaminasiya Önləmə",
    icon: "⚠️",
    when: "both",
    items: [
      { id: "cc1", label: "Çiy ət ayrı saxlanılır (alt rəf, qapalı qab)", type: "check", critical: true },
      { id: "cc2", label: "MAVİ əlcək: çiy ət + yumurta üçün istifadə olunur", type: "check", critical: true },
      { id: "cc3", label: "ŞƏFFAF əlcək: hazır yemək / servis üçün", type: "check", critical: true },
      { id: "cc4", label: "Sarı yumurta qırıcı — YALNIZ yumurta üçün (xüsusi alət)", type: "check", critical: true },
      { id: "cc5", label: "Rəng kodlu doğrama taxtaları istifadə olunur", type: "check", critical: true },
      { id: "cc6", label: "Sanitizer bezlər 30 dəqiqədə bir dəyişdirilir", type: "check", critical: true },
      { id: "cc7", label: "Sanitizer konsentrasiya: 1 tablet / 10 litr ilıq su", type: "check", critical: true },
      { id: "cc8", label: "Grill avadanlıqları hər 4 saatda sanitize olunur", type: "check", critical: true },
      { id: "cc9", label: "Allergen məhsullar ayrı saxlanılır + işarələnib", type: "check", critical: true },
    ],
  },

  // ═══ 8. MƏHSUL QƏBUL ═══
  {
    id: "receiving",
    title: "Məhsul Qəbul / Təsəllüm",
    icon: "📦",
    when: "ongoing",
    items: [
      { id: "rc1", label: "Soyuq məhsul temperatur: 1-5°C arası", type: "temperature", target: "1-5°C (qəbul)", critical: true },
      { id: "rc2", label: "Dondurulmuş məhsul temperatur: -16°C və aşağı", type: "temperature", target: "-16°C (qəbul)", critical: true },
      { id: "rc3", label: "Hər təslimdan 2 təsadüfi qutu yoxlanıb (soyuq+dondurulmuş+quru)", type: "check", critical: true },
      { id: "rc4", label: "Qablaşdırma bütövdür (zədəsiz, sızmaz, açılmamış)", type: "check", critical: true },
      { id: "rc5", label: "SİT yoxlanıb (qəbul zamanı)", type: "check", critical: true },
      { id: "rc6", label: "Qaim / POD alınıb", type: "check", critical: false },
      { id: "rc7", label: "Məhsul DƏRHAL saxlama yerinə qoyulub (gec qalma yox!)", type: "check", critical: true },
    ],
  },

  // ═══ 9. SU + BUZ ═══
  {
    id: "water-ice",
    title: "Su Filtrasiya + Buz Keyfiyyəti",
    icon: "💧",
    when: "opening",
    items: [
      { id: "wi1", label: "Su filtresi işləyir (0.2 mikron — MƏCBURİ)", type: "check", critical: true },
      { id: "wi2", label: "Su filtresi tarixdədir (vaxtı keçməyib)", type: "check", critical: true },
      { id: "wi3", label: "Buz keyfiyyəti: şəffaf, qoxusuz, dad normal", type: "check", critical: true },
      { id: "wi4", label: "Buz makinesi daxili: küf yoxdur", type: "check", critical: true },
      { id: "wi5", label: "Buz kürəyi təmiz, dezinfeksiya edilib, düzgün saxlanılır", type: "check", critical: true },
      { id: "wi6", label: "Buz filtresi tarixdədir", type: "check", critical: false },
    ],
  },

  // ═══ 10. SAXLAMA QAYDALARI ═══
  {
    id: "storage-rules",
    title: "Saxlama Qaydaları + Hava Sirkulyasiyası",
    icon: "📐",
    when: "opening",
    items: [
      { id: "sg1", label: "Divardan 5 sm məsafə saxlanılır", type: "check", critical: false },
      { id: "sg2", label: "Qutular arası 3 sm boşluq var", type: "check", critical: false },
      { id: "sg3", label: "Tavandan 15 sm məsafə saxlanılır", type: "check", critical: false },
      { id: "sg4", label: "Evaporatordan 30 sm məsafə saxlanılır", type: "check", critical: false },
      { id: "sg5", label: "Termostat ayarı: soyuducu 2°C, dondurucu -23°C", type: "check", critical: true },
      { id: "sg6", label: "Həddindən artıq buz yığılması yoxdur", type: "check", critical: false },
      { id: "sg7", label: "Evaporator təmiz, fan düzgün işləyir", type: "check", critical: false },
    ],
  },

  // ═══ 11. İŞÇİ SAĞLAMLIQ ═══
  {
    id: "employee-health",
    title: "İşçi Sağlamlıq Yoxlaması",
    icon: "🏥",
    when: "opening",
    items: [
      { id: "eh1", label: "İshal əlamətli işçi YOX (işə buraxılmaz)", type: "check", critical: true },
      { id: "eh2", label: "Qusma əlamətli işçi YOX", type: "check", critical: true },
      { id: "eh3", label: "Qızdırma əlamətli işçi YOX", type: "check", critical: true },
      { id: "eh4", label: "Sarılıq əlamətli işçi YOX", type: "check", critical: true },
      { id: "eh5", label: "Qızdırma + boğaz ağrısı olan işçi YOX", type: "check", critical: true },
    ],
  },

  // ═══ 12. TƏMİZLİK + SANİTASİYA ═══
  {
    id: "cleaning",
    title: "Təmizlik və Sanitasiya",
    icon: "🧹",
    when: "closing",
    items: [
      { id: "cl1", label: "Bütün iş səthlərinin təmizliyi + dezinfeksiyası", type: "check", critical: true },
      { id: "cl2", label: "Sökülən avadanlıqlar yuyulub sanitize edilib", type: "check", critical: true },
      { id: "cl3", label: "Yer təmizliyi (mətbəx + salon)", type: "check", critical: false },
      { id: "cl4", label: "Zibil konteynerləri boşaldılıb + təmizlənib", type: "check", critical: false },
      { id: "cl5", label: "Tualetlər təmizlənib + ləvazimat tamamlanıb", type: "check", critical: false, requiresPhoto: true },
      { id: "cl6", label: "Dezinfeksiya məhlulu son yoxlama (ppm)", type: "check", critical: true },
    ],
  },

  // ═══ 13. ZƏRƏRVERİCİ KONTROL ═══
  {
    id: "pest-control",
    title: "Zərərverici Kontrolü",
    icon: "🪳",
    when: "opening",
    items: [
      { id: "pc1", label: "Zərərverici əlaməti yoxdur (görmə, iz, ifrazat)", type: "check", critical: true },
      { id: "pc2", label: "Qapı və pəncərələr düzgün bağlanır", type: "check", critical: false },
      { id: "pc3", label: "Zibil sahəsi təmiz və qapalı", type: "check", critical: false },
    ],
  },
];
