// ─── BÖYÜMƏ AYIRICISI ───────────────────────────────────────────────────────
//
// PROBLEM: «avqust iyuldan %8 çoxdur» cümləsi öz-özlüyündə mənasızdır. İçində
// üç fərqli hadisə var və üçü fərqli qərar tələb edir:
//   ① eyni filial daha çox/az satdı  → əməliyyat məsələsi
//   ② yeni filial açıldı             → investisiya nəticəsi
//   ③ filial bağlandı                → portfel qərarı
// Ayrılmasa Masazır «−100%», Səbail 3 «+∞» görünür və heç biri doğru deyil.
//
// NİYƏ FAİZ YOX, MANAT: keçən dövrdə 0 satan filialın faiz artımı sonsuzdur.
// Manat fərqi həmişə toplana bilir və cəmi yoxlanıla bilir:
//     eyni + yeni + bağlanan = xalis fərq   (həmişə)

export type FilialDovr = {
  filial: string
  /** Cari dövr cirosu (₼). Satış yoxdursa 0. */
  cari: number
  /** Keçən dövr cirosu (₼). Satış yoxdursa 0. */
  kecen: number
  /** Ticarət zonası — verilməsə filial öz zonasıdır. */
  zona?: string | null
}

export type Novu = 'eyni' | 'yeni' | 'baglanan' | 'bos'

/**
 * Filialın bu iki dövr arasındakı növü.
 *
 * «bos» = hər iki dövrdə sıfır. Bu, silinməli sətir deyil — hesabatda
 * görünməlidir, çünki «filial var, satış yoxdur» ciddi bir haldır.
 */
export function filialNovu(f: FilialDovr): Novu {
  const c = f.cari > 0, k = f.kecen > 0
  if (c && k) return 'eyni'
  if (c && !k) return 'yeni'
  if (!c && k) return 'baglanan'
  return 'bos'
}

export type Ayirma = {
  /** Σ cari − Σ keçən. Hesabatın başlığındakı rəqəm. */
  xalis: number
  /** Hər iki dövrdə işləyən filialların fərqi — ƏSL performans. */
  eyni: number
  /** Yalnız cari dövrdə olan filialların cirosu. */
  yeni: number
  /** Yalnız keçən dövrdə olan filialların itən cirosu (mənfi). */
  baglanan: number
  /** Eyni filialların keçən dövr cəmi — LFL faizinin məxrəci. */
  eyniKecen: number
  /** Like-for-like faiz. Məxrəc 0-dırsa null (sonsuzluq yazılmır). */
  eyniFaiz: number | null
  say: Record<Novu, number>
}

export function boyumeAyir(sətirlər: readonly FilialDovr[]): Ayirma {
  const a: Ayirma = {
    xalis: 0, eyni: 0, yeni: 0, baglanan: 0, eyniKecen: 0, eyniFaiz: null,
    say: { eyni: 0, yeni: 0, baglanan: 0, bos: 0 },
  }
  for (const f of sətirlər) {
    const nov = filialNovu(f)
    a.say[nov]++
    a.xalis += f.cari - f.kecen
    if (nov === 'eyni') { a.eyni += f.cari - f.kecen; a.eyniKecen += f.kecen }
    else if (nov === 'yeni') a.yeni += f.cari
    else if (nov === 'baglanan') a.baglanan -= f.kecen
  }
  a.eyniFaiz = a.eyniKecen > 0 ? (a.eyni / a.eyniKecen) * 100 : null
  return a
}

// ─── ZONA ───────────────────────────────────────────────────────────────────

export type ZonaSetri = Ayirma & {
  zona: string
  filiallar: string[]
  cari: number
  kecen: number
  /** Zonada birdən çox filial varsa təkbətək müqayisə yanıldıcıdır. */
  paylasilan: boolean
}

/**
 * Zona üzrə yığ.
 *
 * NİYƏ LAZIMDIR: Səbail 2 −34,6%, Səbail 3 +∞ görünür — aralarında 140 m var,
 * yəni eyni qonaq kütləsi. Zona cəmi +44,3%-dir. Filial-filial baxan adam
 * «Səbail 2 çökdü, bağlayaq» deyir; zonaya baxan «transfer olub, zona böyüyüb»
 * deyir. İkinci doğrudur.
 */
export function zonayaYig(sətirlər: readonly FilialDovr[]): ZonaSetri[] {
  const qrup = new Map<string, FilialDovr[]>()
  for (const f of sətirlər) {
    const z = (f.zona ?? '').trim() || f.filial
    const list = qrup.get(z)
    if (list) list.push(f); else qrup.set(z, [f])
  }
  return [...qrup.entries()].map(([zona, list]) => ({
    zona,
    filiallar: list.map(f => f.filial).sort((a, b) => a.localeCompare(b, 'az')),
    cari: list.reduce((s, f) => s + f.cari, 0),
    kecen: list.reduce((s, f) => s + f.kecen, 0),
    paylasilan: list.length > 1,
    ...boyumeAyir(list),
  })).sort((a, b) => b.cari - a.cari)
}

/**
 * Filialın tarixə görə bu dövrdə İŞLƏK olub-olmadığı.
 *
 * NİYƏ SATIŞA BAXMAQ AZDIR: satışı 0 olan filial həm bağlı ola bilər, həm də
 * açıq olub heç nə satmamış ola bilər. İkincisi fəlakətdir və gizlənməməlidir.
 * Tarix varsa ondan gedilir; yoxdursa satışa baxılır.
 */
export function dovrdeIslek(
  b: { opened_at?: string | null; closed_at?: string | null },
  dovrBaslangic: string, dovrSon: string,
): boolean {
  if (b.opened_at && b.opened_at > dovrSon) return false        // hələ açılmayıb
  if (b.closed_at && b.closed_at < dovrBaslangic) return false  // artıq bağlanıb
  return true
}
