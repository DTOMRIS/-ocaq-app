// ─── ƏHATƏ SİYASƏTİ (saf məntiq, baza yoxdur) ───────────────────────────────
//
// NİYƏ AYRI FAYL: «kim nəyi görür» qərarı əvvəl SQL `where` şərtlərinin içində
// gizli idi. Sorğunun içindəki qərar test edilə bilmir — regressiya yalnız
// «səhv müdir səhv filialın datasını gördü» şikayəti ilə üzə çıxır. Burada
// qərar saf funksiyadır, sorğu isə yalnız onu icra edir.
//
// ƏSAS QAYDA: TANINMAYAN ROL HEÇ NƏ GÖRMÜR. Yeni rol əlavə ediləndə (məsələn
// «trainer») burada açıq yazılmasa əhatəsi BOŞ olur — səssizcə geniş olmaz.

export const TANINAN_ROLLAR = ['super_admin', 'region_manager', 'branch_manager', 'staff'] as const
export type Rol = typeof TANINAN_ROLLAR[number]

export function tanınanRol(rol: string): rol is Rol {
  return (TANINAN_ROLLAR as readonly string[]).includes(rol)
}

/**
 * Rolun filial əhatəsini NECƏ tapdığı.
 *   hamisi → tenant-dakı bütün aktiv filiallar
 *   bolge  → idarə etdiyi bölgələrin filialları
 *   mudiri → `branches.manager_id` özüdür
 *   kadr   → `staff_profiles.branch_id`
 *   yox    → əhatə boşdur
 */
export type EhateUsulu = 'hamisi' | 'bolge' | 'mudiri' | 'kadr' | 'yox'

export function filialEhateUsulu(rol: string): EhateUsulu {
  switch (rol) {
    case 'super_admin':    return 'hamisi'
    case 'region_manager': return 'bolge'
    case 'branch_manager': return 'mudiri'
    case 'staff':          return 'kadr'
    default:               return 'yox'      // tanınmayan rol → BOŞ
  }
}

/**
 * Bölgə əhatəsi.
 *   hamisi → bütün bölgələr
 *   ozu    → `regions.manager_id` özüdür
 *   filial → əhatəsindəki filialların bölgələri (aşağıdan yuxarı)
 *   yox    → boş
 */
export type BolgeUsulu = 'hamisi' | 'ozu' | 'filial' | 'yox'

export function bolgeEhateUsulu(rol: string): BolgeUsulu {
  switch (rol) {
    case 'super_admin':    return 'hamisi'
    case 'region_manager': return 'ozu'
    case 'branch_manager':
    case 'staff':          return 'filial'
    default:               return 'yox'
  }
}

/**
 * Bir id əhatəyə daxildirmi.
 *
 * NİYƏ AYRI FUNKSİYA: `null`/`undefined` id-nin «hər şeyə icazə» kimi
 * oxunmaması üçün. Boş əhatə + boş id = HƏMİŞƏ false.
 */
export function ehateyeDaxil(ehate: readonly string[], id: string | null | undefined): boolean {
  if (!id) return false
  return ehate.includes(id)
}

/**
 * Bildiriş/brifinq auditoriyası seçimi bu rol üçün icazəlidirmi.
 * `staff` heç bir auditoriya seçə bilməz (mesaj göndərən deyil, alandır).
 */
export type AuditoriyaNovu = 'all' | 'role' | 'region' | 'branch' | 'selected'

export function auditoriyaSeceBiler(rol: string): boolean {
  return rol === 'super_admin' || rol === 'region_manager' || rol === 'branch_manager'
}

/**
 * «Hamıya» göndərmə yalnız super_admin-dədir. Bölgə müdiri «hamı» seçsə
 * bu, onun öz əhatəsi ilə MƏHDUDLAŞMALIDIR — genişlənməməlidir.
 */
export function auditoriyaGenisleneBiler(rol: string, nov: AuditoriyaNovu): boolean {
  if (rol === 'super_admin') return true
  return nov !== 'all'
}
