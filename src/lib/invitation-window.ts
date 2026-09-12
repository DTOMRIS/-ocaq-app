/**
 * DƏVƏT LİNKİNİN ETİBARLILIQ MÜDDƏTİ — tək yerdə.
 *
 * NİYƏ 48 SAATDAN 7 GÜNƏ UZADILDI (12.09.2026):
 * 48 saat ofis işçisi üçün normaldır, FİLİAL MÜDİRİ üçün deyil. Müdir günün
 * çox hissəsini zalda keçirir, e-poçtu həftədə bir-iki dəfə açır; həftə sonu
 * göndərilən dəvət bazar ertəsi artıq ölü olur. Nəticə: müdir girə bilmir,
 * kimsə yenidən dəvət göndərməli olur, iş 3-4 gün gecikir.
 *
 * TƏHLÜKƏSİZLİK TARAZLIĞI: token BİR DƏFƏLİKDİR və bazada HEŞLƏNMİŞ saxlanılır
 * (açıq mətn yalnız e-poçtdadır). Uzun pəncərənin riski oğurlanmış poçt
 * qutusudur — o halda 48 saat da kifayət edir. 7 gün sənaye standartıdır
 * (GitHub 7 gün, Slack 30 gün).
 */
export const DEVET_GUN = 7
export const DEVET_MS = DEVET_GUN * 24 * 60 * 60 * 1000

/** Yeni dəvətin bitmə tarixi. */
export const devetSonu = () => new Date(Date.now() + DEVET_MS)

/** İnsan dilində müddət — e-poçtda və ekranda eyni mətn işlənsin. */
export const DEVET_METN = `${DEVET_GUN} gün`
