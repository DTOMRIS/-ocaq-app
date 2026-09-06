// ─── AÇILIŞ ŞABLONU — filial profilinə görə vəzifə yaradan master siyahı ────
//
// Mənbə (3 sənəd birləşdirilib):
//   · «Zaman Planı + Tam Kontrol Siyahısı» (23.06.2026) — geri sayım + katalog
//   · «Açılış Dəyərləndirmə və Təsdiq Formu» — Stage-Gate G0–G6
//   · İstifadəçi qeydi 06.09.2026 — KEÇMİŞ AÇILIŞLARDA UNUDULANLAR
//
// NİYƏ SABİT SİYAHI DEYİL: mall food court-da masa/stul lazım deyil, terası
// olmayan filialda teras icazəsi mənasızdır. Sabit siyahı ya şişir, ya əskik
// qalır — hər iki halda etibarını itirir və doldurulmur. Ona görə hər vəzifənin
// `cond` sahəsi var: profil uyğun gəlmirsə vəzifə HEÇ YARANMIR.
//
// Operasyon El Kitabının «7. AÇILIŞA HAZIRLIK» bölməsi BOŞDUR (başlıq var,
// məzmun yox) və ekipman siyahısı «buraya qoyulacaq» yazır — bu fayl həmin
// boşluğu doldurur.

export type AcilisFormat = 'kuce' | 'mall' | 'flagship' | 'kiosk'

/** Filial profili — vəzifə siyahısını BU müəyyən edir. */
export type AcilisProfil = {
  format: AcilisFormat
  teras: boolean
  bagca: boolean
  oturma: boolean
  pizza: boolean
  catdirilma: boolean
  qaz: boolean
  generator: boolean
}

export type AcilisSablon = {
  gate: string
  /** Açılışdan neçə gün əvvəl. null = qapıya bağlıdır, sabit tarixi yoxdur. */
  offset: number | null
  dept: string
  task: string
  /** null = hər açılışda var. Əks halda profil şərti. */
  cond: string | null
  note: string | null
}

export const ACILIS_SABLON: AcilisSablon[] = [
  { gate: 'G0', offset: null, dept: 'OPS', task: 'Servis-icra hazırlıq balı (1–5) qiymətləndirilir', cond: null, note: 'Full-service açılışda kritik' },
  { gate: 'G0', offset: null, dept: 'OPS', task: 'Portföy qərarı: bu nöqtə şəbəkəyə nə əlavə edir?', cond: null, note: null },
  { gate: 'G1', offset: null, dept: 'İdari İşlər', task: 'Filial adı, ünvan, zona sistemə daxil edilir', cond: null, note: 'Açılış qeydinin başlanğıcı' },
  { gate: 'G1', offset: null, dept: 'İdari İşlər', task: 'Sahə m² ölçülür (içəri / teras / bağça ayrı)', cond: null, note: null },
  { gate: 'G1', offset: null, dept: 'OPS', task: 'Lokasiya skorkartı doldurulur (10 meyar, 1–5)', cond: null, note: '≥3,5 güclü' },
  { gate: 'G1', offset: null, dept: 'OPS', task: 'Ən yaxın N1 filiallarına məsafə ölçülür', cond: null, note: '<300 m = qırmızı bayraq' },
  { gate: 'G1', offset: null, dept: 'Marketinq', task: 'Piyada trafiki sayımı (7 gün × 4 dilim)', cond: null, note: 'Unit economics kalibrləməsi' },
  { gate: 'G2', offset: null, dept: 'İdari İşlər', task: 'İcarə şərtləri, vergi rejimi, icarəsiz dövr aydınlaşdırılır', cond: null, note: 'Depozit YALNIZ G3-dən sonra' },
  { gate: 'G2', offset: null, dept: 'Maliyyə', task: 'İcarə/ciro nisbəti hesablanır (yay + qış ayrı)', cond: null, note: '≤%12 hədəf · >%18 qırmızı' },
  { gate: 'G2', offset: null, dept: 'İdari İşlər', task: 'Kirayə müqaviləsinin hazırlanması', cond: null, note: null },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Elektrik gücü (amper/kVA) ölçülür', cond: null, note: 'QSR 400–800 A' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: '3 faz + panel + ayrılmış xətlər yoxlanılır', cond: null, note: null },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Baca / egzoz marşrutu təsdiqlənir', cond: null, note: 'AÇILIŞ KATİLİ — dam üstünə çıxmalı' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Type I davlumbaz + yanğın söndürmə (UL-300/NFPA 96)', cond: null, note: 'Dönər/qril üçün məcburi' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Make-up (təzə) hava sistemi — egzozun %80–100-ü', cond: null, note: 'Olmazsa qoxu salona keçir' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Qaz xətti mövcudluğu yoxlanılır', cond: null, note: 'AZ-də partərdə adətən YOX → tam elektrik' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Yağ tutucu (grease trap)', cond: null, note: 'Kod tələbi' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Su təzyiqi/həcm + isti su xətti', cond: null, note: null },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Yer mazgalı / pis su xətti meyli', cond: null, note: null },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Tavan hündürlüyü ≥3 m', cond: null, note: 'Davlumbaz/kanal üçün' },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Döşəmə yükü / sütun açıqlığı', cond: null, note: null },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'Mal qəbulu / yük boşaltma imkanı', cond: null, note: null },
  { gate: 'G3', offset: null, dept: 'İnşaat', task: 'MEP əlavə CAPEX smetası çıxarılır', cond: null, note: 'Büdcəni keçirsə G4-də STOP' },
  { gate: 'G4', offset: null, dept: 'Maliyyə', task: 'Satış ssenariləri (pessimist/baza/optimist)', cond: null, note: 'Qonşu filial datasına lövbərlə' },
  { gate: 'G4', offset: null, dept: 'Maliyyə', task: 'Kannibalizasiya və şəbəkə EBITDA artımı', cond: null, note: 'Breakeven transfer eşiyi' },
  { gate: 'G4', offset: null, dept: 'Maliyyə', task: 'Başabaş (break-even) günlük satış və çek sayı', cond: null, note: null },
  { gate: 'G4', offset: null, dept: 'Maliyyə', task: 'CAPEX büdcəsi təsdiqlənir', cond: null, note: null },
  { gate: 'G4', offset: null, dept: 'Maliyyə', task: 'Çəkili skorinq → GO / NO-GO', cond: null, note: '≥4,0 güclü · <3,0 NO-GO' },
  { gate: 'G4', offset: null, dept: 'OPS', task: 'İdarə Heyəti təsdiqi (5 imza)', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'İnşaat proyekti çıxarılır', cond: null, note: 'm² və format təsdiqləndikdən sonra' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'Smeta + timeline + vendor bağlanır', cond: null, note: 'Açılış tarixi YALNIZ bundan sonra' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'İnşaat başlayır', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'OPS', task: 'Həftəlik inşaat və idarəetmə toplantıları', cond: null, note: 'Proyektə uyğunluq' },
  { gate: 'G6', offset: 30, dept: 'İK', task: 'İdarəedicilər və rəhbərlər seçilir və təlimləndirilir', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İK', task: 'İşçi alımı: pizza ustası 2 · dönər ustası 2 · qab yuyan 1 · xadimə 2 · kassir 2 · menecer 1 · administrator 1', cond: null, note: 'Kadro sayı formata görə dəyişir' },
  { gate: 'G6', offset: 30, dept: 'İK', task: 'Hostes alımı', cond: 'format==\'flagship\'', note: 'Yalnız full-service' },
  { gate: 'G6', offset: 30, dept: 'İK', task: 'Sosial mediadan işçi axtarışı elanları', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İK', task: 'Müraciət formaları + işçi qəbulunun təşkili', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'VÖEN + obyekt kodu (15 rəqəmli)', cond: null, note: 'e-voen.az' },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'AQTA qeydiyyatı (e-afsa.gov.az)', cond: null, note: 'Qida obyekti' },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Kassa qeydiyyatı', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'FHN icazələri (yanğın təhlükəsizliyi)', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Ekologiya icazələri', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Elektrik, su, qaz sayğaclarının işlənməsi', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Zibil yerinin müəyyən edilməsi / konteyner', cond: 'format!=\'mall\'', note: 'Mall-da idarəetmə şirkəti verir' },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Reklam lövhəsi icazəsi (ADRA)', cond: 'format!=\'mall\'', note: 'Mall-da öz qaydaları' },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Elan / reklam vergisi', cond: 'format!=\'mall\'', note: null },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Teras icazəsi (yerli icra hakimiyyəti)', cond: 'teras', note: 'YALNIZ terası olan filial' },
  { gate: 'G6', offset: 30, dept: 'İdari İşlər', task: 'Möhür (tarix + filial adı)', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'Marketinq', task: 'Dış reklam tabelası sifarişi', cond: 'format!=\'mall\'', note: null },
  { gate: 'G6', offset: 30, dept: 'Marketinq', task: 'Ticarət bölgəsi və marketinq bölümü ilə əlaqə', cond: null, note: null },
  { gate: 'G6', offset: 30, dept: 'OPS', task: 'Xidmət təchizatçılarının seçilməsi (təmizlik, elektrik, IT, ocaq, soyuducu)', cond: null, note: null },
  { gate: 'G6', offset: 15, dept: 'İK', task: 'Formalar (uniforma) və isimliklər hazır', cond: null, note: null },
  { gate: 'G6', offset: 15, dept: 'OPS', task: 'İlk yardım dolabı hazır', cond: null, note: null },
  { gate: 'G6', offset: 15, dept: 'Marketinq', task: 'Ətrafdakı işyerlərinə tanışlıq / fürsət araşdırması', cond: null, note: null },
  { gate: 'G6', offset: 15, dept: 'Satın Alma', task: 'Satınalmaların yenilənməsi', cond: null, note: null },
  { gate: 'G6', offset: 15, dept: 'Satın Alma', task: 'Sifariş və çatdırılma tarixlərinin yoxlanması', cond: null, note: null },
  { gate: 'G6', offset: 15, dept: 'Logistika', task: 'Ehtiyat proyeksiyası və ilk sifariş logistikaya daxil edilir', cond: null, note: null },
  { gate: 'G6', offset: 10, dept: 'OPS', task: 'İnşaat planı və təqvimi yoxlanılır (gecikmə?)', cond: null, note: null },
  { gate: 'G6', offset: 10, dept: 'OPS', task: 'Planlanan açılış tarixi təsdiqlənir', cond: null, note: null },
  { gate: 'G6', offset: 10, dept: 'OPS', task: 'Komanda iclası — açılış iş proqramı', cond: null, note: null },
  { gate: 'G6', offset: 10, dept: 'İdari İşlər', task: 'Texniki servis müqavilələri (soyuducu, ocaq, klima, dezinfeksiya, zibil, POS/IT, yanğın)', cond: null, note: null },
  { gate: 'G6', offset: 10, dept: 'OPS', task: 'Təmizlik və dərmanlama firması ilə mağazanı gəz, tarix qərarlaşdır', cond: null, note: null },
  { gate: 'G6', offset: 10, dept: 'İdari İşlər', task: 'Ofis fayl və ləvazimat sifarişləri', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'OPS', task: 'Müdir və köməkçiləri işbaşı təliminə başlayır', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'İK', task: 'Komanda üzvü sayı tamamlanmış olmalıdır', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'Satın Alma', task: 'Bütün ehtiyatların sifarişi verilmiş olmalı', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'OPS', task: 'Bütün montajlar bitmiş olmalı', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'Bilgi İşlem', task: 'IT qurulu və işlək (kassa, POS, internet)', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'Bilgi İşlem', task: 'Wolt hesabı açıldı və inteqrasiya edildi', cond: 'catdirilma', note: null },
  { gate: 'G6', offset: 7, dept: 'Bilgi İşlem', task: 'Bolt Food hesabı açıldı və inteqrasiya edildi', cond: 'catdirilma', note: null },
  { gate: 'G6', offset: 7, dept: 'Bilgi İşlem', task: 'WiFi şifrələrinin müəyyən edilməsi', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'Bilgi İşlem', task: 'Kameraların sistemə inteqrasiyası', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'Marketinq', task: 'Canlı çiçək sifarişi', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'İK', task: 'Ekip dolabları alındı, personal otaqları hazır', cond: null, note: null },
  { gate: 'G6', offset: 7, dept: 'OPS', task: 'YANĞIN VƏ TƏCİLİ VƏZİYYƏT PLANI hazır, bütün komanda bilir', cond: null, note: 'KRİTİK' },
  { gate: 'G6', offset: 7, dept: 'OPS', task: 'Açılışda hər kəs öz rolunu bilir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'İnşaat tamamlandı və təhvil alındı, əksiklər siyahısı verildi', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Avadanlıq, masa və stasionların yerləşdirilməsi', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Yanğın balonları, təmizlik dolabı təhvil alındı', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Qapı girişinə yer paspası və küllük', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Camların silinməsi', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Terasın hazırlanması', cond: 'teras', note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Bağça sahəsinin hazırlanması', cond: 'bagca', note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Qıfıllar və açarlar yoxlandı', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'İK', task: 'Komanda təlimi kafedə davam edir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Ehtiyat otaqları və tualetlər hazır və təmiz', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'Bilgi İşlem', task: 'Telefon (restoran mobil) və fiber internet işləyir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'Bilgi İşlem', task: 'IT sistemi, kassalar və kassa proqramı işləyir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'Bilgi İşlem', task: 'POS alətləri bağlı və işləyir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Dərin dondurucu, soyuq dolab, ocaq işləyir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'İK', task: 'Komanda kassanı istifadə etməyi bilir', cond: null, note: null },
  { gate: 'G6', offset: 5, dept: 'OPS', task: 'Xəbərləşmə stendi və sağlamlıq/təhlükəsizlik məlumatları asılı', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'OPS', task: 'Komanda mağazadadır, bütün sənədlər asılıb', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'OPS', task: 'Hava pərdəsi, kondisioner və emişlər işləyir', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'Marketinq', task: 'Xarici vizuallar (poster, stend) yerində, aydınlatma hazır', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'Satın Alma', task: 'Bütün məhsullar (donmuş + quru ehtiyat) mağazada', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'Satın Alma', task: 'Dönər əti, çörək, souslar və şorbalar sifariş edildi', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'Satın Alma', task: 'Pizza xəmiri sifariş edildi', cond: 'pizza', note: null },
  { gate: 'G6', offset: 2, dept: 'OPS', task: 'Bütün alət və avadanlıqlar işlək (fritöz, ocaq, toster, dolablar, poslar)', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'Maliyyə', task: 'Xırda (bozuk) pul ehtiyacının təmini', cond: null, note: null },
  { gate: 'G6', offset: 2, dept: 'OPS', task: 'Masa duzluqları, bibər, salfet qabları yerləşdirildi', cond: 'oturma', note: 'Oturma sahəsi olmayan formatda lazım deyil' },
  { gate: 'G6', offset: 1, dept: 'İK', task: 'Komanda istirahət günü', cond: null, note: null },
  { gate: 'G6', offset: 1, dept: 'OPS', task: 'Son təmizlik', cond: null, note: null },
  { gate: 'G6', offset: 1, dept: 'OPS', task: 'Kafeni detallı gəz', cond: null, note: null },
  { gate: 'G6', offset: 1, dept: 'OPS', task: 'Son idarəetmə toplantısı', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Su filtr sistemi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Generator — binada varsa bağlanması', cond: 'generator', note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Paslanmaz tezgahlar', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Peç / Fritöz / Çalışma tezgahları', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Dönər ocağı + dönər bıçaqları + kəsmə avadanlıqları', cond: null, note: 'ƏSAS — hər filialda' },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Pizza sobası', cond: 'pizza', note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Pizza taxtaları, pizza kürəyi, mərdanə', cond: 'pizza', note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Toster', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'İstilik ölçüm cihazı', cond: null, note: 'HACCP' },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Vitrin', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Bar avadanlıqları (qəhvə aparatı, tərəzi, dəyirman, kokteyl)', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Dondurma dolabı və stəkanları', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Salat / tort dolabı', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'İçki dolabları', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Mikser (böyük) + kiçik əl alətləri', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Ət rəfləri / dərin dondurucu / soyuducu / skald stelajı', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Təpsilər, qablar, bıçaq, maşa, isidicilər', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Oturma qrupları (masa, stul, divan)', cond: 'oturma', note: 'MALL FOOD COURT-DA LAZIM DEYİL' },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Çini qab dəstləri, servis dəstləri, çəngəl, bıçaq, menajlar', cond: 'oturma', note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Uşaq üçün yemək stulu', cond: 'oturma', note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Teras mebeli və çətirlər', cond: 'teras', note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Su stəkanları, salfet və qablaşdırma ləvazimatları', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Tualet avadanlıqları, zibil qabları, küllüklər', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Personal otağı — dolap, tualet malzemeleri', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Soyutma sistemi / klima / hava pərdəsi / əmişlər', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Təmizlik malzemeleri üçün dolap', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Yanğın balonlarının (söndürücü) sifarişi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Avadanlıqların təhvil alınması və sınanması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Avadanlıq kitablarının (təlimatların) toplanması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Kassa qurulması və NBA firması ilə vergi sinxronizasiyası', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'POS sisteminin qurulması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Bankdan kredit kartı POS-larının təmini', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Notebook (laptop) təmin edilməsi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Printer (4 ədəd)', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Məhsulların kassaya daxil edilməsi / qiymətlərin təyini', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'WiFi sisteminin qurulması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Kameraların qurulması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Musiqi sisteminin qurulması və testi', cond: 'oturma', note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'Menü ekranlarının (LCD) qurulması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Bilgi İşlem', task: 'OCAQ inteqrasiyası — filial sistemə bağlanır', cond: null, note: 'branch_id + iiko_org_id' },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Menülərin dizaynı və çapı (masa menüsü + ekran menüsü)', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Ekranlarda yayınlanacaq menü və reklam kontenti', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Yol tərəfinə reklam yerləşdirilməsi', cond: 'format==\'kuce\'', note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Divar reklam və foto zona', cond: 'oturma', note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: '«Açılırıq / Açıldıq» bayraqları və el ilanları', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Məhsul etiketləri', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Açılış-bağlanış saatlarının yapışdırılması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'Ayaqlı poster / pano', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'SMM səhifələrinin açılması və kontent planı', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Marketinq', task: 'SMM reklamının verilməsi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'İK', task: 'DMA ilə təlim təşkili', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'İK', task: 'Çalışma proqramları', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'İK', task: 'Forma (geyim) sifarişi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'EĞT', task: 'Təlim şöbəsi və təlim proqramlarının təşkili', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'EĞT', task: 'Açılış öncəsi təlimlərin verilməsi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'OPS', task: 'Növbə və yerləşim (floor) planlarının hazırlanması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'OPS', task: 'Usta ilə birlikdə menyu təqdimatının çalışılması', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Maliyyə', task: 'Point sistemi və maaş sisteminin müəyyən edilməsi', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'İlk sifarişlərin verilməsi (xammal, qablaşdırma)', cond: null, note: null },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'Barda ƏL YUMA yeri (lavabo) proyektə salınır', cond: null, note: 'UNUDULDU — sanitar tələb, sonradan tikilə bilmir' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'Zaldan bara açılan qapı tipi seçilir (kovboy / ortası şüşəli gəmici qapısı)', cond: null, note: 'UNUDULDU — düz qapı toqquşma yaradır' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'Arxa giriş qapısına pəncərə + milçək toru (sineklik)', cond: null, note: 'UNUDULDU — HACCP' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'Giriş/çıxış EXIT və təhlükə işıqları', cond: null, note: 'UNUDULDU — yanğın tələbi' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'Teras üçün tente / çətir konstruksiyası', cond: 'teras', note: 'UNUDULDU' },
  { gate: 'G5', offset: null, dept: 'İnşaat', task: 'İnşaat müqaviləsi: gecikmə cəzası + proyektə uyğunluq + material legandı + sığorta bildirişi', cond: null, note: 'El Kitabı §6' },
  { gate: 'G5', offset: null, dept: 'Maliyyə', task: 'İnşaat ödənişi: BAŞLAMADAN ödəmə yox · %10 təminat 1–2 ay saxlanılır', cond: null, note: 'El Kitabı §6 — xırda əksiklər bitsin deyə' },
  { gate: 'G5', offset: null, dept: 'OPS', task: 'Şantiye şefi / koordinator təyin olunur', cond: null, note: 'El Kitabı §6' },
  { gate: 'G6', offset: 5, dept: 'Satın Alma', task: 'Milçək üçün ultraviole cihazı (içəri)', cond: null, note: 'UNUDULDU — HACCP' },
  { gate: 'G6', offset: 5, dept: 'Bilgi İşlem', task: 'UPS cihazları (kassa + POS + soyuducu)', cond: null, note: 'UNUDULDU — kəsintidə məhsul itkisi' },
  { gate: 'G6', offset: 2, dept: 'Satın Alma', task: 'Duz qabı, bibər qabı', cond: 'oturma', note: 'UNUDULDU' },
  { gate: 'G6', offset: 2, dept: 'Satın Alma', task: 'Masa üstü balaca zibil qabı', cond: 'oturma', note: 'UNUDULDU' },
  { gate: 'G6', offset: 2, dept: 'Satın Alma', task: 'Masa nömrələri', cond: 'oturma', note: 'UNUDULDU' },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Zal stasionları', cond: 'oturma', note: 'UNUDULDU' },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Qəhvə filtr sistemi', cond: null, note: 'UNUDULDU — su filtrindən AYRI' },
  { gate: 'G5', offset: null, dept: 'Satın Alma', task: 'Cola premix sistemi və qurulumu', cond: null, note: 'UNUDULDU' },
  { gate: 'G6', offset: 5, dept: 'Marketinq', task: 'Pilon (ayaqlı işıqlı tabela)', cond: 'format!=\'mall\'', note: 'UNUDULDU' },
  { gate: 'G6', offset: 5, dept: 'Marketinq', task: 'Tente üzərinə brendinq', cond: 'teras', note: 'UNUDULDU' },
  { gate: 'G6', offset: 2, dept: 'Marketinq', task: 'Qapıya «İTƏLƏ / ÇƏK» stikeri', cond: null, note: 'UNUDULDU' },
  { gate: 'G6', offset: 2, dept: 'Marketinq', task: 'Qapıya iş saatları stikeri', cond: null, note: 'UNUDULDU' },
  { gate: 'G6', offset: 21, dept: 'Satın Alma', task: 'QİDA sifarişləri verilir — SON TARİX', cond: null, note: 'UNUDULDU/GECİKDİ — 21 gün öncə bağlanır' },
  { gate: 'G6', offset: 21, dept: 'Satın Alma', task: 'QEYRİ-QİDA sifarişləri verilir — SON TARİX', cond: null, note: 'UNUDULDU/GECİKDİ — 21 gün öncə bağlanır' },
  { gate: 'G6', offset: 3, dept: 'OPS', task: 'Açılışdan ƏVVƏL dərmanlama (ilaçlama) icra olunur', cond: null, note: 'UNUDULDU — müqavilə deyil, İCRA' },
]

/**
 * Şərt qiymətləndirici — `eval` İŞLƏDİLMİR (şablon məlumatdır, kod deyil).
 * Dəstəklənən formalar:  `teras`  ·  `format=='mall'`  ·  `format!='mall'`
 */
export function sertUygun(cond: string | null, p: AcilisProfil): boolean {
  if (!cond) return true
  const eq = cond.match(/^\s*format\s*(==|!=)\s*'([a-z]+)'\s*$/)
  if (eq) {
    const [, op, val] = eq
    return op === '==' ? p.format === val : p.format !== val
  }
  const bayraq = cond.trim()
  if (bayraq in p) return Boolean((p as unknown as Record<string, unknown>)[bayraq])
  return false      // tanınmayan şərt → vəzifə YARADILMIR (səssiz «true» təhlükəlidir)
}

export type YaradilanVezife = {
  gate: string; dept: string; task: string; note: string | null
  cond: string | null; offset: number | null
  /** `offset` varsa açılış tarixindən geri sayılır; yoxsa null. */
  due: string | null
}

const GATE_SIRA: Record<string, number> = { G0: 0, G1: 1, G2: 2, G3: 3, G4: 4, G5: 5, G6: 6 }

/** Profil + açılış tarixi → filiala uyğun vəzifə siyahısı. */
export function vezifeYarat(p: AcilisProfil, acilisTarixi: string): YaradilanVezife[] {
  const t0 = new Date(acilisTarixi + 'T00:00:00Z')
  const out: YaradilanVezife[] = []
  for (const s of ACILIS_SABLON) {
    if (!sertUygun(s.cond, p)) continue
    let due: string | null = null
    if (s.offset != null) {
      const d = new Date(t0); d.setUTCDate(d.getUTCDate() - s.offset)
      due = d.toISOString().slice(0, 10)
    }
    out.push({ gate: s.gate, dept: s.dept, task: s.task, note: s.note, cond: s.cond, offset: s.offset, due })
  }
  out.sort((a, b) =>
    (GATE_SIRA[a.gate] - GATE_SIRA[b.gate]) ||
    ((a.due ? 0 : 1) - (b.due ? 0 : 1)) ||
    ((a.due ?? '') < (b.due ?? '') ? -1 : (a.due ?? '') > (b.due ?? '') ? 1 : 0) ||
    a.dept.localeCompare(b.dept))
  return out
}

// ─── SİFARİŞ TİPİ ───────────────────────────────────────────────────────────
// İstifadəçi qeydi: «ölçü ilə olanlar hər filiala uyğun olduğu üçün qeyd edə
// bilmirəm». Gecikmələrin əsas səbəbi bu iki tipi qarışdırmaqdır:
//   STANDART → hər filialda eynidir → MƏRKƏZİ STOKDA saxlanılır → dərhal gedir
//   ÖLÇÜLÜ   → filiala özəldir → ölçü alınmadan sifariş VERİLƏ BİLMİR
export const STOK_STANDART: string[] = [
  'Nerj un qabı',
  'Nerj zibil qabı',
  'Nerj salfetka qabı',
  'Dolab Steyşn böyük',
  'Dolab zibil qabı',
]
export const STOK_OLCULU: string[] = [
  'Paslanmaz tezgahlar',
  'Zal stasionları',
  'Vitrin',
  'Bar avadanlıqları',
  'Oturma qrupları (masa, stul, divan)',
  'Teras mebeli və çətirlər',
  'Tente / çətir konstruksiyası',
  'Davlumbaz və baca',
]
