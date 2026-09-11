'use client'

/** Çap pəncərəsini açır — brauzerin «PDF olaraq saxla» seçimi buradadır. */
export default function CapDugmesi() {
  return (
    <button onClick={() => window.print()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
      Çap et / PDF saxla
    </button>
  )
}
