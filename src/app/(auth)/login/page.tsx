'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' }}>
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #C8102E 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-8"
             style={{ background: 'radial-gradient(circle, #C8102E 0%, transparent 70%)' }} />
        <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-red-500/30 animate-pulse" />
        <div className="absolute top-3/4 right-1/3 w-1.5 h-1.5 rounded-full bg-red-400/20 animate-pulse" 
             style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 rounded-full bg-orange-400/20 animate-pulse"
             style={{ animationDelay: '2s' }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-4">
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-2xl opacity-20 blur-xl"
             style={{ background: 'linear-gradient(135deg, #C8102E, #ff4444, #C8102E)' }} />
        
        <div className="relative rounded-2xl p-8 border"
             style={{ 
               background: 'rgba(18, 18, 18, 0.85)',
               backdropFilter: 'blur(20px)',
               borderColor: 'rgba(200, 16, 46, 0.15)',
             }}>
          
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                 style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)' }}>
              <span className="text-3xl">🔥</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">OCAQ</h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>
              Operasyonel Kontrol & Analiz Qurğusu
            </p>
          </div>

          {/* Error message */}
          {state?.error && (
            <div className="mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2"
                 style={{ 
                   background: 'rgba(239, 68, 68, 0.1)',
                   border: '1px solid rgba(239, 68, 68, 0.2)',
                   color: '#fca5a5',
                 }}>
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {state.error}
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>
                E-poçt
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="#666" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@ocaq.app"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(200, 16, 46, 0.5)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(200, 16, 46, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#ccc' }}>
                Şifrə
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="#666" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(200, 16, 46, 0.5)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(200, 16, 46, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="#666" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="#666" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <a href="/reset-password" className="text-xs transition-colors duration-200 hover:text-red-400"
                 style={{ color: '#888' }}>
                Şifrəni unutdunuz?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              style={{ 
                background: isPending 
                  ? 'rgba(200, 16, 46, 0.5)' 
                  : 'linear-gradient(135deg, #C8102E 0%, #E8112D 100%)',
                boxShadow: '0 4px 20px rgba(200, 16, 46, 0.3)',
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{ background: 'linear-gradient(135deg, #E8112D 0%, #ff2244 100%)' }} />
              
              <span className="relative flex items-center justify-center gap-2">
                {isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Daxil olunur...
                  </>
                ) : (
                  'Daxil ol'
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#555' }}>
              © {new Date().getFullYear()} OCAQ — Bütün hüquqlar qorunur
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
