'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function AcceptInviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
      <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full" />
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteLoading />}>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordStrength =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0)

  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e']
  const strengthLabels = ['Zəif', 'Orta', 'Yaxşı', 'Güclü']

  async function handleSubmit(e: React.FormEvent) {
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
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Xəta baş verdi')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Şəbəkə xətası. Yenidən cəhd edin.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
        <div className="text-center p-8 rounded-2xl"
             style={{ background: 'rgba(18,18,18,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-bold text-white mb-2">Etibarsız link</h2>
          <p className="text-sm" style={{ color: '#888' }}>Dəvət tokeni tapılmadı.</p>
          <a href="/login" className="inline-block mt-4 text-sm text-red-400 hover:text-red-300 transition-colors">
            Girişə qayıt →
          </a>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
        <div className="text-center p-8 rounded-2xl max-w-md"
             style={{ background: 'rgba(18,18,18,0.85)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="text-5xl mb-4 block animate-bounce">🎉</span>
          <h2 className="text-xl font-bold text-white mb-2">Xoş gəldiniz!</h2>
          <p className="text-sm mb-4" style={{ color: '#888' }}>
            Hesabınız uğurla yaradıldı. Giriş səhifəsinə yönləndirilirsiniz...
          </p>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full animate-pulse"
                 style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', width: '100%',
                          animation: 'shrink 3s linear forwards' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
      
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #C8102E 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-8"
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
              <span className="text-3xl">🔥</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dəvəti Qəbul Et</h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>Hesabınızı yaradın</p>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>
                Ad Soyad
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad Soyad"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(200,16,46,0.5)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(200,16,46,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>
                Şifrə
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 simvol"
                  className="w-full px-4 pr-12 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(200,16,46,0.5)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(200,16,46,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="#666" viewBox="0 0 24 24" strokeWidth={1.5}>
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                           style={{ background: i < passwordStrength ? strengthColors[passwordStrength - 1] : 'rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColors[passwordStrength - 1] || '#666' }}>
                    {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Çox qısa'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>
                Şifrəni təsdiqlə
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrəni yenidən daxil edin"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200"
                style={{ 
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(200,16,46,0.5)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(200,16,46,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #C8102E 0%, #E8112D 100%)',
                       boxShadow: '0 4px 20px rgba(200,16,46,0.3)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{ background: 'linear-gradient(135deg, #E8112D 0%, #ff2244 100%)' }} />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Yaradılır...
                  </>
                ) : (
                  'Hesab yarat'
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <a href="/login" className="text-xs transition-colors hover:text-red-400" style={{ color: '#888' }}>
              Artıq hesabınız var? Daxil olun →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
