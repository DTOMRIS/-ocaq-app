'use client'

import { useState } from 'react'

export default function QualityFormRecordActions({
  id,
  version,
  status,
  canApprove,
  canVoid,
  canCorrect,
  isCurrent,
}: {
  id: string
  version: number
  status: string
  canApprove: boolean
  canVoid: boolean
  canCorrect: boolean
  isCurrent: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function action(actionName: 'approve' | 'void') {
    let reason = ''
    if (actionName === 'void') {
      reason = window.prompt('Ləğv səbəbini yazın (ən az 5 simvol):')?.trim() ?? ''
      if (!reason) return
    }
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/quality-forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionName,
          expected_version: version,
          reason,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Əməliyyat tamamlanmadı')
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Xəta baş verdi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <a href={`/dashboard/quality-forms/records/${id}/print`}
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
        Bax / Çap
      </a>
      {canCorrect && isCurrent && ['submitted', 'approved'].includes(status) && (
        <a href={`/dashboard/quality-forms/records/${id}/correct`}
          className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800">
          Düzəliş
        </a>
      )}
      {canApprove && isCurrent && status === 'submitted' && (
        <button type="button" disabled={busy} onClick={() => action('approve')}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
          Təsdiqlə
        </button>
      )}
      {canVoid && status !== 'voided' && (
        <button type="button" disabled={busy} onClick={() => action('void')}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">
          Ləğv et
        </button>
      )}
      {message && <p className="w-full text-right text-xs font-semibold text-red-700">{message}</p>}
    </div>
  )
}
