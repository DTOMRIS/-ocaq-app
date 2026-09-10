// ─── YENİ FİLİAL SİFARİŞ KATALOQU ───────────────────────────────────────────
//
// Mənbə: istifadəçinin 09.09.2026 tarixli 5 Excel siyahısı (Mərkəzi Anbar).
//
// NİYƏ 5 YOX, 4 KATEQORİYA:
//   «Yeni Filial (zal-mətbəx)» faylının 52 sətrinin HAMISI «Fırın qeyri-qida»
//   faylında EYNİ MİQDARLA var (yoxlanıldı: fərq 0). Fırın-da əlavə 4 sətir
//   var (Peçka, Un qabı nerj, Aşsüzən, Bıçaq iri). Yəni zal-mətbəx Fırın-ın
//   alt çoxluğudur. Hər ikisi sifariş edilsə 52 məhsul İKİ DƏFƏ gedir —
//   pizza taxtası 40 yerinə 80, lahmacun kağızı 850 yerinə 1700.
//   Ona görə zal-mətbəx AYRI kateqoriya kimi saxlanılmır.
//
// NİYƏ KODDA (bazada yox): bu şəbəkə standartıdır — hər açılışda eynidir və
// dəyişəndə hamı üçün dəyişməlidir. Açılış yaradılanda sətirlər
// `opening_orders`-a KOPYALANIR, ona görə köhnə açılışın sifarişi sonradan
// şablon dəyişsə də olduğu kimi qalır (bax `opening_tasks` ilə eyni məntiq).

import { type AcilisProfil, sertUygun } from './template'

export const SIFARIS_KATLAR = ['Qida', 'Qeyri-qida', 'Bar', 'Fırın'] as const
export type SifarisKat = typeof SIFARIS_KATLAR[number]

/**
 * Kateqoriya şərti. Yalnız Fırın şərtlidir — pizza/lahmacun olmayan filiala
 * peçka və 850 lahmacun kağızı göndərmək açıq itkidir. Qalan üç siyahı hər
 * filiala gedir; lazımsız sətir UI-da «lazım deyil» edilir (gizli məntiq yox).
 */
export const SIFARIS_KAT_SERT: Record<SifarisKat, string | null> = {
  'Qida': null, 'Qeyri-qida': null, 'Bar': null, 'Fırın': 'pizza',
}

export type SifarisSetri = {
  kat: SifarisKat
  ad: string
  /** Sabit miqdar. `perMasa` varsa null. */
  say: number | null
  vahid: string
  /** Masa sayına vurulur. Yeganə dəyişən budur. */
  perMasa?: number
  /** Sifarişi kim verir — boşdursa Satın Alma. */
  dept?: string
  qeyd?: string
}

// ─── MASA SAYINA BAĞLI SƏTİRLƏR ─────────────────────────────────────────────
// Sabit siyahıda «Duz qabı 100» və «Salfet qabı 50» yazılıb — bu rəqəmlər
// təxminən 50 masalıq filial üçündür. 24 masalıq filiala da 100 duz qabı
// getməsi ehtiyatın anbarda qalması deməkdir. Ona görə bu sətirlər masa
// sayına bağlandı və nisbət olduğu kimi saxlanıldı (duz 2/masa, salfet 1/masa).
//
// ⚠ İSTİOT QABI 5 SİYAHININ HEÇ BİRİNDƏ YOXDUR. Siyahıda yalnız «Qara istiot
// (ə) 1 kq» — yəni istiotun ÖZÜ var, qabı yox. Masaya qoyulacaq qab sifariş
// edilmirdi. Duzla eyni nisbətlə əlavə edildi.
export const SIFARIS_MASA: SifarisSetri[] = [
  { kat: 'Qeyri-qida', ad: 'Duz qabı',    say: null, vahid: 'əd', perMasa: 2 },
  { kat: 'Qeyri-qida', ad: 'İstiot qabı', say: null, vahid: 'əd', perMasa: 2,
    qeyd: 'Siyahıda yox idi — duzla eyni nisbətdə əlavə edildi' },
  { kat: 'Qeyri-qida', ad: 'Salfet qabı', say: null, vahid: 'əd', perMasa: 1 },
  { kat: 'Qeyri-qida', ad: 'Masa stikeri', say: null, vahid: 'əd', perMasa: 1,
    dept: 'Marketinq', qeyd: 'Dizayn və miqdarı Marketinq təsdiqləyir' },
]

export const SIFARIS_KATALOQ: SifarisSetri[] = [

  // ── QIDA — «Yeni Filial (qida).xlsx» (128 sətir) ──
  { kat: 'Qida', ad: 'Acı bibər (ə)', say: 3, vahid: 'Banka 290 q' },
  { kat: 'Qida', ad: 'Acı bibər jalapeno(doğranmış) (ə)', say: 1, vahid: 'Banka 370 gr' },
  { kat: 'Qida', ad: 'Bibər yaşıl (m-t)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Aşsüzən', say: 2, vahid: 'əd' },
  { kat: 'Qida', ad: 'Bulyon knor Sebzili (ə)', say: 1, vahid: 'Qutu 750 q' },
  { kat: 'Qida', ad: 'Çörək Tost (ə)', say: 2, vahid: 'əd' },
  { kat: 'Qida', ad: 'Darçın tozu (i)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Darçın çubuq (i)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal düyü uzun', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Duz iri - xörək duzu (ə)', say: 3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Fıstıq Antep (ə)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Fri (ə)', say: 25, vahid: 'Paket 2.5 kq' },
  { kat: 'Qida', ad: 'Fri kənd (ə)', say: 5, vahid: 'Paket 2.5 kq' },
  { kat: 'Qida', ad: 'Fri yağı (ə)', say: 6, vahid: 'Qab 5 lt' },
  { kat: 'Qida', ad: 'Kəklikotu (i)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Konfet (Cobarde ağ) (ə)', say: 2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Konfet (Cobarde qara) (ə)', say: 2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Konfet Toffix Mix (ə)', say: 2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Küncüt ağ (ə)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Küncüt qara (ə)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Limon duzu (ə)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Maya (ə)', say: 2, vahid: 'Paket 500 q' },
  { kat: 'Qida', ad: 'Mixək (i)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Nanə çay üçün (ə)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Oreqano (ə)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Pendir Mozarella (ə)', say: 12, vahid: 'kq' },
  { kat: 'Qida', ad: 'Pendir Parmesan (ə)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Pendir Kənd (ə)', say: 1, vahid: 'Qab 500 gr' },
  { kat: 'Qida', ad: 'Şəkər tozu (Pesok) (ə)', say: 3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Pul bibər (ə)', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Qara istiot (ə)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Qarğıdalı yağı (ə)', say: 15, vahid: 'L' },
  { kat: 'Qida', ad: 'Qaymaq "Milla" (ə)', say: 5, vahid: 'Paket 200 ml' },
  { kat: 'Qida', ad: 'Qoz ləpəsi (ə)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal Qreçka', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Sarıkök (ə)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Sirop Banan (i)', say: 1, vahid: '1 lt' },
  { kat: 'Qida', ad: 'Sirop BubleGum (i)', say: 1, vahid: '1 lt' },
  { kat: 'Qida', ad: 'Sirop Çiyələk (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Sirop Karamel (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Sirop Nar (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Sirop Şokolad (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Sucuk (ə)', say: 1.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Sucuk Kamar (Salami) (ə)', say: 2, vahid: 'Paket 500 qr' },
  { kat: 'Qida', ad: 'Toping Sous Çiyələk (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Toping Sous Karamel (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Toping Sous Şokolad (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Personal Makaron (5 kq)', say: 1, vahid: 'Paket' },
  { kat: 'Qida', ad: 'Yarpız (i)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Yumurta (ə)', say: 60, vahid: 'əd' },
  { kat: 'Qida', ad: 'Zeytun qara (ə)', say: 1, vahid: 'Qutu 4 kq' },
  { kat: 'Qida', ad: 'Zeytun yağı (ə)', say: 1, vahid: 'Dəmir qutu 5 lt' },
  { kat: 'Qida', ad: 'Pure Çiyələk (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Pure Mango (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Pure Marakuya (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Pure Ananas (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Qaymaq Dekor Up (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Tomat "Final" (ə)', say: 2, vahid: 'Banka 720 q' },
  { kat: 'Qida', ad: 'Duz narın- süfrə duzu (ə)', say: 1, vahid: 'Kisə 25 kq' },
  { kat: 'Qida', ad: 'Mayonez (ə)', say: 1, vahid: 'Vedrə 10 kq' },
  { kat: 'Qida', ad: 'Lokum (i)', say: 0.5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Vanil 5 qr (ə)', say: 40, vahid: 'əd' },
  { kat: 'Qida', ad: 'İsti şokolad ağ (i)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'İsti şokolad qara (i)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Şaurma əti tədarük', say: 100, vahid: 'kq' },
  { kat: 'Qida', ad: 'Coffee (i)', say: 1, vahid: 'Paket 1 kq' },
  { kat: 'Qida', ad: 'Pure Moruq (i)', say: 1, vahid: 'L' },
  { kat: 'Qida', ad: 'Sirop Mango (i)', say: 1, vahid: '1 lt' },
  { kat: 'Qida', ad: 'Qatıq (ə)', say: 5, vahid: 'Vədrə 8 kq' },
  { kat: 'Qida', ad: 'Oreo şokolad (i)', say: 12, vahid: 'əd' },
  { kat: 'Qida', ad: 'Red bull (i)', say: 1, vahid: 'Kaset 24' },
  { kat: 'Qida', ad: 'Marshmellow (i)', say: 2, vahid: 'Paket 70 q' },
  { kat: 'Qida', ad: 'Personal Çay', say: 2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Hil (i)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Konfet "Pticni Moloko Şokolad" (ə)', say: 2.3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Konfet "Zolotaya Liliya Şokolad" (ə)', say: 2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Sirop Ananas (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Sirop Marakuya (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Sirop Kivi (i)', say: 1, vahid: '700 ml' },
  { kat: 'Qida', ad: 'Kofe şəkəri (i)', say: 1, vahid: 'Qutu 1000' },
  { kat: 'Qida', ad: 'Turşu xiyar Kornişon (ə)', say: 12, vahid: 'Banka 190 qr' },
  { kat: 'Qida', ad: 'Personal qəndi', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal Mərci', say: 3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Holland pendiri Adanus', say: 12, vahid: 'kq' },
  { kat: 'Qida', ad: 'Un. (ə)', say: 1, vahid: 'Kisə 50 kq' },
  { kat: 'Qida', ad: 'Personal Toyuq', say: 10, vahid: 'kq' },
  { kat: 'Qida', ad: 'Sous nuggets(Sweet Chili) (ə)', say: 1, vahid: 'Butulka 0.800 lt' },
  { kat: 'Qida', ad: 'Holland pendiri (ə)', say: 3.25, vahid: 'kq' },
  { kat: 'Qida', ad: 'Berqa çay (i)', say: 3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Su qazlı Badamlı', say: 1, vahid: 'Kaset 20' },
  { kat: 'Qida', ad: 'Su qazsız Badamlı', say: 1, vahid: 'Kaset 20' },
  { kat: 'Qida', ad: 'Badamlı 300 ml şüşə qazlı', say: 1, vahid: 'Kaset 15' },
  { kat: 'Qida', ad: 'Badamlı 300 ml şüşə qazsız', say: 1, vahid: 'Kaset 15' },
  { kat: 'Qida', ad: 'Harput Dibek Kahvesi Sadə(i)', say: 1, vahid: 'Paket 500 q' },
  { kat: 'Qida', ad: 'Çay yaşıl atma (i)', say: 1, vahid: 'Paket 25' },
  { kat: 'Qida', ad: 'Limonlu Tarta Latte', say: 1, vahid: 'Paket 500gr' },
  { kat: 'Qida', ad: 'Dondurma Banan Latte', say: 1, vahid: 'Paket 500gr' },
  { kat: 'Qida', ad: 'Moruq Reyhan Latte', say: 1, vahid: 'Paket 500gr' },
  { kat: 'Qida', ad: 'Peçenye şokoladlı', say: 80, vahid: 'əd' },
  { kat: 'Qida', ad: 'Personal Lobya qara', say: 3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Xiyar turşusu (ə)', say: 10, vahid: 'Kaset 6 - 2 kq' },
  { kat: 'Qida', ad: 'Künəfə (ə)', say: 30, vahid: 'əd' },
  { kat: 'Qida', ad: 'Göbələk (ə)', say: 2, vahid: 'Qutu 500 q' },
  { kat: 'Qida', ad: 'Barbekyu Sous (ə)', say: 1, vahid: 'Qab 0.510' },
  { kat: 'Qida', ad: 'Kinder şokolad (i)', say: 6, vahid: 'əd' },
  { kat: 'Qida', ad: 'Fri Şaurma (ə)', say: 20, vahid: 'Paket 2.5 kq' },
  { kat: 'Qida', ad: 'Şirə Portağal (çöplü) (i)', say: 27, vahid: 'əd' },
  { kat: 'Qida', ad: 'Personal Marqarin yağı', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Matcha Sadə', say: 1, vahid: 'Paket 0.5 kq' },
  { kat: 'Qida', ad: 'Matcha Duzlu fıstıq', say: 1, vahid: 'Paket 0.5 kq' },
  { kat: 'Qida', ad: 'Personal Kartof', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal Soğan', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal pomidor', say: 3, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal badımcan', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Personal yumurta', say: 30, vahid: 'əd' },
  { kat: 'Qida', ad: 'Personal qatıq', say: 1, vahid: 'Qab 8 kq' },
  { kat: 'Qida', ad: 'Mini Ekler', say: 60, vahid: 'əd' },
  { kat: 'Qida', ad: 'Ketçup Colorado Dip Pot (ə)', say: 2, vahid: 'Qutu 100' },
  { kat: 'Qida', ad: 'Cəfəri (g)', say: 5, vahid: 'kq' },
  { kat: 'Qida', ad: 'Dağ keşnişi (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Göy Soğan (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'İspanaq (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Kahı (g)', say: 1, vahid: 'kq' },
  { kat: 'Qida', ad: 'Keşniş (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Nanə (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Kəvər (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Reyhan (g)', say: 0.2, vahid: 'kq' },
  { kat: 'Qida', ad: 'Şüyüd (g)', say: 0.2, vahid: 'kq' },

  // ── QEYRI-QIDA — «Yeni Filial Qeyri-qida.xlsx» (181 sətir) ──
  { kat: 'Qeyri-qida', ad: 'Ağardıcı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Arxiv Qovluğu', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ayaq altı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ayaq altı metrəlik', say: 2, vahid: 'metr' },
  { kat: 'Qeyri-qida', ad: 'Bərk şotka', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Batareyka (Nazik)', say: 1, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Batareyka (Qalın)', say: 1, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Camsil (şüşə təmizləyici)', say: 1, vahid: 'Qab 5 lt' },
  { kat: 'Qeyri-qida', ad: 'Ceyran dərisi', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ceyran dərisi ağ', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Şotka sapı taxta', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Şotka sapı uzun', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Tualet şotkası', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Yumşaq şotka', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab (balaca)', say: 3, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab (böyük)', say: 6, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab (orta)', say: 3, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 1 lt', say: 15, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 10 lt', say: 6, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 2 lt', say: 15, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 21 lt', say: 6, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 30 lt', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 50 lt', say: 6, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qab 80 lt', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls Sup qabı', say: 50, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Salat qabı pls', say: 50, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Çömçə böyük', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dəftər', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dəftər boyuk', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dəmir külqabı', say: 50, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Xətkeş (dəmir)', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls Tas kiçik', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Şaurma taxta kağızı', say: 780, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Şaurma möhürü kvadrat', say: 300, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Şaurma paketi', say: 2000, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dəsmal', say: 5, vahid: 'metr' },
  { kat: 'Qeyri-qida', ad: 'Marli', say: 5, vahid: 'metr' },
  { kat: 'Qeyri-qida', ad: 'Desert çəngəli', say: 12, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Müştəri Qaşığı', say: 48, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Taxta qaşıq, mətbəx böyük', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dostavka paketi', say: 1020, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Çəngəl paketi', say: 580, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Müştəri çəngəli', say: 48, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Duz qabı X', say: 3, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Əl sabunu', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qab şampunu', say: 2, vahid: 'Qab 5 l' },
  { kat: 'Qeyri-qida', ad: 'Yağ təmizləyici (sökücü) vasitə', say: 1, vahid: 'Qab 20 lt' },
  { kat: 'Qeyri-qida', ad: 'Əlcək Con', say: 3, vahid: 'cüt' },
  { kat: 'Qeyri-qida', ad: 'Əlcək fəhlə', say: 3, vahid: 'cüt' },
  { kat: 'Qeyri-qida', ad: 'Med əlcək (Qara)', say: 3, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Ələk (dəmir)', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Saçaklı pol əskisi', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dəri fartuk', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Klyonka fartuk', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Parça fartuk', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Fayl', say: 1, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Fri alt taxtası', say: 40, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Fri qutusu', say: 500, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Fri götürən iri', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Fri setkası', say: 40, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Fri setkası X', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Göy paket', say: 20, vahid: 'kq' },
  { kat: 'Qeyri-qida', ad: 'Qara paket', say: 20, vahid: 'kq' },
  { kat: 'Qeyri-qida', ad: 'Şəffaf paket', say: 500, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qeydiyyat kağızı', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Kalkulyator', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Kartof əzən', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Kartof soyan', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Karandaş', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Karakız', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Printer çeki', say: 10, vahid: 'Paket 10' },
  { kat: 'Qeyri-qida', ad: 'Kəfkir balaca', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Kist', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zontik (Kokteyl)', say: 1, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Papaq Qırmızı', say: 5, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Papaq Sarı', say: 5, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ləyən (xəmir)', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Marker', say: 10, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Menyu', say: 40, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nəm salfet', say: 600, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nərdivan', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Osvejitel', say: 3, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Peç', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pizza boşqabı', say: 40, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Karakız vedrəsi', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Salat taxtası', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qayçı', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qazan balaca', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qazan tutan', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Rakşa', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qələm', say: 10, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Salfet rulon (WC)', say: 12, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Salfet Dispenser (250 əd)', say: 72, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Salat götürən', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Domestos', say: 1, vahid: 'Qab 20 lt' },
  { kat: 'Qeyri-qida', ad: 'Sup qabı (altdığı) Yeni', say: 30, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Sup qabı (şüşə) Yeni', say: 30, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Şvabra kəpənək', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Toz alan', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Truboçka', say: 4, vahid: 'Paket 500' },
  { kat: 'Qeyri-qida', ad: 'Troynik', say: 3, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Tyorka', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Udlinitel', say: 6, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Uşaq oturacağı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ütü', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ütü altdığı', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ütü fırça', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Vərəq A4 altdığı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Xəkəndaz', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Xlor', say: 2, vahid: 'Qab 5 lt' },
  { kat: 'Qeyri-qida', ad: 'Zajiqalka', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Z qatlama salfet (WC)', say: 48, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zibil qabı setqalı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zibil qabı (Pedallı) balaca', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zibil qabı Böyük Yaşıl', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Qıf', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Stul kassir', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls qaşıq ECO', say: 200, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls çəngəl ECO', say: 200, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls bıçaq ECO', say: 100, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Papaq Qara', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Salfet (5130 əd)', say: 12000, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Sous qabı şüşə', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Veşelka (yapışqan)', say: 2, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Ventilyator', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Çek keçirtmək üçün iyne', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Taz (Dəmir)', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Tərəzi Elektron', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Tarix kağızı', say: 10, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Baxıl', say: 1, vahid: 'Paket' },
  { kat: 'Qeyri-qida', ad: 'Stol əskisi(təmizlik bezi)', say: 10, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nagets qutusu (12 əd)', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nagets qutusu (20 əd)', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nagets qutusu (30 əd)', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nagets qutusu (8 əd)', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Sabun qabı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Organizer qaşıq üçün', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Sita (süzgəc)', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Karakız dəst', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Kofe tutacaq S', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ağ pizza paket', say: 20, vahid: 'kq' },
  { kat: 'Qeyri-qida', ad: 'Ağ paket', say: 20, vahid: 'kq' },
  { kat: 'Qeyri-qida', ad: 'Kassa çeki', say: 3, vahid: 'Paket 30' },
  { kat: 'Qeyri-qida', ad: 'F1 Dashboard Wax Spray', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls Tas orta', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pls Tas boyuk', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Maye əl sabunu', say: 1, vahid: 'Qab 5 lt' },
  { kat: 'Qeyri-qida', ad: 'Camsil qabı', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Personal fincan', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Personal Çaynik', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Personal qaşıq', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Personal çəngəl', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Personal boşqabı', say: 20, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Tarix vuran aparat', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pol əskisi', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Tava', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pres aparatı', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dəmir zibilqabı stolüstü', say: 50, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Samovar 20lt', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Ət vedrəsi', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Pingvin', say: 1500, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Çəkic', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Maqnit', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Seyf', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Taxta qaşıq, mətbəx balaca', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Kassa hesabat vərəqi', say: 50, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Metrə', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Nuggets setkası X', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zibil qabı (Pedallı) böyük', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Toster', say: 1, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Xadimə futbolkası', say: 6, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zibil qabı (Pedallı) orta', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Med papaq qara', say: 50, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Diş çöpü', say: 3, vahid: 'Paket 750' },
  { kat: 'Qeyri-qida', ad: 'Köynək Qırmızı', say: 5, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Köynək Qara Barmen', say: 2, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Köynək Qara', say: 4, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Dezodorant', say: 3, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Köynək Sarı', say: 5, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Otkrıvalka (qapaq açan)', say: 10, vahid: 'əd' },
  { kat: 'Qeyri-qida', ad: 'Zibil paketi 50x60', say: 10, vahid: 'əd' },

  // ── BAR — «Yeni Filial (Bar qeyri qida).xlsx» (80 sətir) ──
  { kat: 'Bar', ad: 'Armudu stəkan', say: 36, vahid: 'əd' },
  { kat: 'Bar', ad: 'Ayran aparatı', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Ayran vedrəsi', say: 2, vahid: 'əd' },
  { kat: 'Bar', ad: 'Ayran qarışdıran', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Ayran qabı', say: 200, vahid: 'əd' },
  { kat: 'Bar', ad: 'Ayran süzən', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Bıçaq itliyən aparat', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Buz paket', say: 5, vahid: 'Paket' },
  { kat: 'Bar', ad: 'Çaynik şamı', say: 2, vahid: 'Paket 50 ədəd' },
  { kat: 'Bar', ad: 'Pls qab 1 lt', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Pls qab 10 lt', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Pls qab 2 lt', say: 5, vahid: 'əd' },
  { kat: 'Bar', ad: 'Pls qab 3 lt', say: 5, vahid: 'əd' },
  { kat: 'Bar', ad: 'İsti stəkan 8', say: 100, vahid: 'əd' },
  { kat: 'Bar', ad: 'Stəkan 300 ml (Coca-Cola)', say: 500, vahid: 'əd' },
  { kat: 'Bar', ad: 'Stəkan 500 ml (Coca-Cola)', say: 500, vahid: 'əd' },
  { kat: 'Bar', ad: 'Limon çəngəli müştəri', say: 12, vahid: 'əd' },
  { kat: 'Bar', ad: 'Dondurma götürən qaşıq', say: 2, vahid: 'əd' },
  { kat: 'Bar', ad: 'Dondurma qaşığı (Yeni)', say: 24, vahid: 'əd' },
  { kat: 'Bar', ad: 'Çaynik müştəri', say: 20, vahid: 'əd' },
  { kat: 'Bar', ad: 'Çaynik altı müştəri', say: 20, vahid: 'əd' },
  { kat: 'Bar', ad: 'Qənd qabı (müştəri)', say: 30, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kofe qaşığı taxta', say: 200, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kokteil truboçkası Qara', say: 1, vahid: 'Paket 100' },
  { kat: 'Bar', ad: 'Late qaşığı', say: 6, vahid: 'əd' },
  { kat: 'Bar', ad: 'Limon sıxan', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Dondurma qabı şüşə', say: 18, vahid: 'əd' },
  { kat: 'Bar', ad: 'Nar sıxan', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Pinset xırda', say: 5, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kofe altığı 2-li - Holder', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kofe altlığı 4-lü - Holder', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'İsi Cream Chargers 10PC (Qaz balonu)', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Şirəçəkən', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Su baçoku', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Taxta qarışdırıcı', say: 500, vahid: 'əd' },
  { kat: 'Bar', ad: 'Buz qabı', say: 2, vahid: 'əd' },
  { kat: 'Bar', ad: 'Buz qıran', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kofe Aparatın dərmanı', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Giger böyük', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Şeyker dəmir', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Avtogen', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Bar rezini', say: 3, vahid: 'əd' },
  { kat: 'Bar', ad: 'Sifon (bar)', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Podnos taxta', say: 15, vahid: 'əd' },
  { kat: 'Bar', ad: 'Pet 500ml Stəkan', say: 100, vahid: 'əd' },
  { kat: 'Bar', ad: 'Organizer 6 qrup', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Steyner', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Bar qaşığı arxası çəngəl', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Bar qaşığı arxası dairə', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Şipçi balaca', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Şipçi böyük', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Şeyker qapaqlı', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Giger balaca', say: 1, vahid: 'əd' },
  // Mənbədə hər ikisi «Piçer» adlanır, fərq yalnız vahid sütununda («300 ml»/
  // «600 ml») — yəni ölçü ora yazılıb. Ad eyni qalsa biri səssizcə itərdi.
  { kat: 'Bar', ad: 'Piçer 300 ml', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Piçer 600 ml', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kakao qabı', say: 2, vahid: 'əd' },
  { kat: 'Bar', ad: 'Şeyker şüşə', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Temper', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Cup for 1 scoop (dondurma qabı)', say: 20, vahid: 'əd' },
  { kat: 'Bar', ad: 'Cup for 2 scoop (dondurma qabı)', say: 20, vahid: 'əd' },
  { kat: 'Bar', ad: 'Cup for 3 scoop (dondurma qabı)', say: 20, vahid: 'əd' },
  { kat: 'Bar', ad: 'Buz aparatı CB 246 26kg/gün', say: 1, vahid: 'əd' },
  // Bar siyahısında EYNİ sətir kimi iki dəfə yazılıb (№70 və №89). 1 ədəd
  // götürüldü: iki qəhvə maşını sifariş etmək artıq sifarişdən bahalıdır.
  // Həqiqətən 2 lazımdırsa miqdar UI-da dəyişdirilir.
  { kat: 'Bar', ad: 'Kofe Aparatı Okko', say: 1, vahid: 'əd',
    qeyd: 'Siyahıda 2 dəfə yazılıb — 1 ədəd götürüldü, təsdiq lazımdır' },
  { kat: 'Bar', ad: 'Espresso stəkanı paket', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Fincan balaca ağ', say: 12, vahid: 'əd' },
  { kat: 'Bar', ad: 'Desert qabı', say: 20, vahid: 'əd' },
  { kat: 'Bar', ad: 'Samovar 20lt', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Etiket (Ayran)', say: 50, vahid: 'əd' },
  { kat: 'Bar', ad: 'Espresso fincanı', say: 6, vahid: 'əd' },
  { kat: 'Bar', ad: 'Fincan çay 250ml (Yeni)', say: 15, vahid: 'əd' },
  { kat: 'Bar', ad: 'Kokteyl bakalı (Yeni)', say: 15, vahid: 'əd' },
  { kat: 'Bar', ad: 'Coffee fincanı 200 ml', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Coffee fincanı 250 ml', say: 15, vahid: 'əd' },
  { kat: 'Bar', ad: 'Freş bakalı (Yeni)', say: 10, vahid: 'əd' },
  { kat: 'Bar', ad: 'Tərəzi bar Yeni', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Zibil qabı (Pedallı) orta', say: 2, vahid: 'əd' },
  { kat: 'Bar', ad: 'Pet 300ml Stəkan', say: 100, vahid: 'əd' },
  { kat: 'Bar', ad: 'Madler (rezin)', say: 1, vahid: 'əd' },
  { kat: 'Bar', ad: 'Lokum qabı', say: 12, vahid: 'əd' },

  // ── FIRIN — «Yeni Filial (Fırın qeyri qida).xlsx» (56 sətir) ──
  { kat: 'Fırın', ad: 'Peçka (Fırın)', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza taxta kağızı', say: 700, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza qutusu 30x30', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza taxtası', say: 40, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza taxtası X', say: 5, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Rezin qaşıq', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Ailə menyusu pizza qutusu', say: 10, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Folqa böyük', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Folqa qab yumru balaca', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Kələm və dondurma qabı paket', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Şpakel balaca', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Şpakel böyük', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Lahmacun kağızı', say: 850, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Ketçup qabı kauçuk', say: 6, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Künəfə taxtası', say: 15, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Lahmacun fırçası', say: 2, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Lahmacun kürəsi', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza kürəsi', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Mərdanə', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Məsəd böyük', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pls qab 30 lt', say: 3, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pide qutusu (35*15)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pide qutusu (40*18)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pinset', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza fırçası', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza roliki (orta)', say: 2, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Salat taxtası', say: 2, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Qoz çəkən', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Streç böyük', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Salat qabı (şüşə) Yeni', say: 30, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Tərəzi 40 kg', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Tyorka', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Sous qabı plastik', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Sous qabı şüşə', say: 30, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Dəmir qab', say: 10, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Tarix kağızı', say: 10, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pizza qutusu 22x22', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Karakız dəst', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Kəlbətin', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pide taxtası', say: 10, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Pide taxta kağızı', say: 415, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Dəmir şpakel', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Xəmir yoğuran aparat', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Künəfə nerj qabı', say: 15, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Tarix vuran aparat', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Tarix möhürü', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Etiket (Lahmacun)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Zibil qabı (Pedallı) orta', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Etiket (Sadə bükmə)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Etiket (Sezar bükmə)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Etiket (Vegeteryan bükmə)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Etiket (Yunan bükmə)', say: 100, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Bıçaq iri', say: 2, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Un qabı nerj', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Aşsüzən', say: 1, vahid: 'əd' },
  { kat: 'Fırın', ad: 'Qrafinka', say: 1, vahid: 'əd' },
]

// ─── TƏKRAR SƏTİR AŞKARLAYICISI ─────────────────────────────────────────────
// 4 siyahıda 16 məhsul adı BİRDƏN ÇOX kateqoriyada var — məsələn «Zibil qabı
// (Pedallı) orta» Bar-da 2, Fırın-da 1, Qeyri-qida-da 2 ədəd. Bunlar səhv
// deyil: hər departament öz stokunu istəyir. Amma anbar cəmi görməsə eyni
// məhsulu 3 ayrı sətir kimi yığır və nə qədər sifariş verildiyini bilmir.
// Ona görə cəm hesablanır və UI-da xəbərdarlıq kimi göstərilir.

/** Az-uyğun açar: İ/I/ı tələsi + diakritik + boşluq/durğu təmizliyi. */
export function sifarisAcar(ad: string): string {
  return ad.replace(/[İIı]/g, 'i').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export type TekrarSetir = { ad: string; katlar: SifarisKat[]; cem: number; vahid: string }

/** Birdən çox kateqoriyada olan məhsullar və ümumi miqdar. */
export function tekrarSetirleri(setirler: readonly SifarisSetri[] = SIFARIS_KATALOQ): TekrarSetir[] {
  const m = new Map<string, TekrarSetir>()
  for (const r of setirler) {
    if (r.say == null) continue
    const k = sifarisAcar(r.ad)
    const e = m.get(k)
    if (e) { e.katlar.push(r.kat); e.cem += r.say }
    else m.set(k, { ad: r.ad, katlar: [r.kat], cem: r.say, vahid: r.vahid })
  }
  return [...m.values()].filter(e => e.katlar.length > 1)
    .sort((a, b) => b.katlar.length - a.katlar.length || a.ad.localeCompare(b.ad))
}

// ─── SİFARİŞ YARATMA ────────────────────────────────────────────────────────

export type YaradilanSifaris = {
  kat: SifarisKat; ad: string; vahid: string; dept: string
  /** Masa sayı girilməyibsə `perMasa` sətirlərində null qalır — sifariş verilə bilməz. */
  qty: number | null
  perMasa: number | null
  qeyd: string | null
}

const VARSAYILAN_DEPT = 'Satın Alma'

/**
 * Profil + masa sayı → sifariş siyahısı.
 *
 * Masa sayı verilməyibsə `perMasa` sətirləri qty=null ilə YARADILIR (silinmir) —
 * belə olanda siyahıda görünür və «masa sayı girilməyib» kimi qırmızı qalır.
 * Sətri tamamilə çıxarsaq unudulur və filial duz qabısız açılır.
 */
export function sifarisYarat(p: AcilisProfil, masaSayi: number | null): YaradilanSifaris[] {
  const hamisi = [...SIFARIS_KATALOQ, ...SIFARIS_MASA]
  const out: YaradilanSifaris[] = []
  for (const r of hamisi) {
    if (!sertUygun(SIFARIS_KAT_SERT[r.kat], p)) continue
    const perMasa = r.perMasa ?? null
    const qty = perMasa != null
      ? (masaSayi != null && masaSayi > 0 ? Math.ceil(perMasa * masaSayi) : null)
      : r.say
    out.push({
      kat: r.kat, ad: r.ad, vahid: r.vahid, dept: r.dept ?? VARSAYILAN_DEPT,
      qty, perMasa, qeyd: r.qeyd ?? null,
    })
  }
  const sira = (k: SifarisKat) => SIFARIS_KATLAR.indexOf(k)
  out.sort((a, b) => sira(a.kat) - sira(b.kat) || a.ad.localeCompare(b.ad, 'az'))
  return out
}
