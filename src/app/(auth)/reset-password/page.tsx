'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
      <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full" />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<'request' | 'reset'>(token ? 'reset' : 'request')

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Xəta baş verdi')
        return
      }
      setSuccess(true)
    } catch {
      setError('Şəbəkə xətası')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir')
      return
    }
    if (password.length < 8) {
      setError('Şifrə minimum 8 simvol olmalıdır')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Xəta baş verdi')
        return
      }
      setSuccess(true)
    } catch {
      setError('Şəbəkə xətası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
      
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #C8102E 0%, transparent 70%)' }} />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="absolute -inset-1 rounded-2xl opacity-20 blur-xl"
             style={{ background: 'linear-gradient(135deg, #C8102E, #ff4444, #C8102E)' }} />

        <div className="relative rounded-2xl p-8 border"
             style={{ background: 'rgba(18,18,18,0.85)', backdropFilter: 'blur(20px)',
                      borderColor: 'rgba(200,16,46,0.15)' }}>
          
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                 style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)' }}>
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {step === 'request' ? 'Şifrəni Sıfırla' : 'Yeni Şifrə'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>
              {step === 'request' ? 'E-poçt adresinizi daxil edin' : 'Yeni şifrənizi təyin edin'}
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="text-center p-4 rounded-lg mb-4"
                 style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span className="text-3xl block mb-2">✅</span>
              <p className="text-sm" style={{ color: '#86efac' }}>
                {step === 'request' 
                  ? 'E-poçt aktiv idarəçi hesabına bağlıdırsa, sıfırlama linki göndərildi. 5 dəqiqə ərzində gəlməzsə Spam qovluğunu yoxlayın; hesabınız hələ yaradılmamış ola bilər.'
                  : 'Şifrəniz uğurla dəyişdirildi!'}
              </p>
              <a href="/login" className="inline-block mt-3 text-sm text-red-400 hover:text-red-300 transition-colors">
                Daxil olun →
              </a>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#fca5a5' }}>
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {/* Request Reset Form */}
          {step === 'request' && !success && (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="p-3 rounded-lg text-xs leading-5"
                   style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                Bu səhifə yalnız əvvəlcədən dəvəti qəbul edilmiş aktiv idarəçi
                hesabları üçündür. İlk dəfə daxil olacaqsınızsa, süper
                yöneticinizdən dəvət istəyin.
              </div>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>E-poçt</label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ocaq.app"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(200,16,46,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(200,16,46,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white relative overflow-hidden group disabled:opacity-60 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #C8102E, #E8112D)', boxShadow: '0 4px 20px rgba(200,16,46,0.3)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                     style={{ background: 'linear-gradient(135deg, #E8112D, #ff2244)' }} />
                <span className="relative">{loading ? 'Göndərilir...' : 'Sıfırlama linki göndər'}</span>
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {step === 'reset' && !success && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="new-pw" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>Yeni Şifrə</label>
                <input id="new-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 simvol"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label htmlFor="confirm-pw" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>Şifrəni Təsdiqlə</label>
                <input id="confirm-pw" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yenidən daxil edin"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white relative overflow-hidden group disabled:opacity-60 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #C8102E, #E8112D)', boxShadow: '0 4px 20px rgba(200,16,46,0.3)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                     style={{ background: 'linear-gradient(135deg, #E8112D, #ff2244)' }} />
                <span className="relative">{loading ? 'Dəyişdirilir...' : 'Şifrəni dəyişdir'}</span>
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <a href="/login" className="text-xs transition-colors hover:text-red-400" style={{ color: '#888' }}>
              ← Girişə qayıt
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
