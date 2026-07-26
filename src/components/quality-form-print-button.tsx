'use client'

import { useState } from 'react'

export default function QualityFormPrintButton({ recordId }: { recordId: string }) {
  const [error, setError] = useState('')

  async function print() {
    setError('')
    const response = await fetch(`/api/quality-forms/${recordId}/print`, { method: 'POST' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error ?? 'Çap hadisəsi qeydə alınmadı')
      return
    }
    window.print()
  }

  return (
    <div className="print:hidden">
      <button type="button" onClick={print}
        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
        Çap et / PDF
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  )
}
