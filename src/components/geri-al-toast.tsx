'use client'

import { useEffect, useState } from 'react'

/**
 * SİLİNDİ → GERİ AL.
 *
 * NİYƏ TƏSDİQ PƏNCƏRƏSİ DEYİL: «Əminsiniz?» sualı işi yavaşladır və insanlar
 * onu oxumadan «Bəli» basır — yəni qorumur. Silməni DƏRHAL etmək, sonra
 * 7 saniyə «geri al» təklif etmək həm sürətlidir, həm də səhvi doğrudan
 * düzəldir. (Geri dönüşü olmayan işlərdə — məsələn açılışın silinməsində —
 * təsdiq yerində qalır.)
 *
 * NİYƏ 7 SANİYƏ: 3–4 saniyə oxumağa yetmir, 10-dan çoxu ekranda ilişib qalır.
 */
export default function GeriAlToast({ mesaj, onGeriAl, onBagla, saniye = 7 }: {
  mesaj: string
  onGeriAl: () => void | Promise<void>
  onBagla: () => void
  saniye?: number
}) {
  const [qalan, setQalan] = useState(saniye)

  useEffect(() => {
    if (qalan <= 0) { onBagla(); return }
    const t = setTimeout(() => setQalan(q => q - 1), 1000)
    return () => clearTimeout(t)
  }, [qalan, onBagla])

  return (
    <div role="status" aria-live="polite" className="ocaq-toast">
      <span className="ocaq-toast-metn">{mesaj}</span>
      <button type="button" onClick={() => void onGeriAl()} className="ocaq-toast-geri">
        Geri al ({qalan})
      </button>
      <button type="button" onClick={onBagla} aria-label="Bağla" className="ocaq-toast-bagla">×</button>
    </div>
  )
}
