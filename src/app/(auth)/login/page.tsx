'use client'

import { useActionState, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from './actions'
import AuthBrandLockup from '@/components/auth-brand-lockup'

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=80",
    alt: "Profesyonal şef — alovlu tavada yemək hazırlayır",
  },
  {
    url: "https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=1200&q=80",
    alt: "İstiqanlı restoran mətbəxi — komanda iş başında",
  },
  {
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80",
    alt: "Premium restoran salonu — axşam atmosferi",
  },
  {
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    alt: "Gözəl təqdim olunmuş yemək — kulinariya sənəti",
  },
]

const LANGS = ["AZ", "TR", "EN", "RU"] as const

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [lang, setLang] = useState<(typeof LANGS)[number]>("AZ")
  const router = useRouter()

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [nextSlide])

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <main style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', background: '#fff', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      {/* Left — Sliding Images */}
      <div className="login-visual" style={{ position: 'relative', width: '50%', minHeight: '100vh', overflow: 'hidden', background: '#0f172a' }}>
        {SLIDES.map((slide, idx) => (
          <div
            key={slide.url}
            style={{
              position: 'absolute',
              inset: 0,
              transition: 'opacity 1s ease-in-out',
              opacity: idx === currentSlide ? 1 : 0,
            }}
          >
            <img
              src={slide.url}
              alt={slide.alt}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
          </div>
        ))}

        {/* Slide dots */}
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              style={{
                height: '6px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: idx === currentSlide ? '32px' : '6px',
                background: idx === currentSlide ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>

        {/* Brand overlay on image */}
        <div style={{ position: 'absolute', bottom: '32px', left: '24px', zIndex: 10 }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, margin: 0 }}>
            Powered by DK Agency
          </p>
        </div>
      </div>

      {/* Right — Welcome + Login Form */}
      <div className="login-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minHeight: '100vh', width: '50%' }}>
        {/* Top bar: logo + language */}
        <div className="login-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 48px' }}>
          <AuthBrandLockup compact />

          {/* Language selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  background: lang === l ? '#fff' : 'transparent',
                  color: lang === l ? '#0f172a' : '#64748b',
                  boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form area */}
        <div className="login-form-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px 32px' }}>
          <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
            
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px', textAlign: 'center' }}>
              OCAQ Portalına giriş
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px', textAlign: 'center' }}>
              E-poçt və şifrənizi daxil edin. Səlahiyyətiniz hesabınıza görə avtomatik açılır.
            </p>

                {/* Error message */}
                {state?.error && (
                  <div style={{
                    marginBottom: '20px',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#be123c',
                  }}>
                    <span>⚠️</span>
                    {state.error}
                  </div>
                )}

                {/* Form */}
                <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Email */}
                  <div>
                    <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                      E-poçt
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' }}>📧</span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="ad@şirkət.az"
                        style={{
                          width: '100%',
                          padding: '12px 12px 12px 40px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                        }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                      Şifrə
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' }}>🔒</span>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '12px 48px 12px 40px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          fontSize: '16px',
                        }}
                      >
                        {showPassword ? '👁️' : '🙈'}
                      </button>
                    </div>
                  </div>

                  {/* Forgot password */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <a href="/reset-password" style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}>
                      Şifrəni unutdunuz?
                    </a>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: isPending ? '#e2e8f0' : '#C8102E',
                      color: isPending ? '#94a3b8' : '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 6px -1px rgba(200, 16, 46, 0.1)',
                    }}
                  >
                    {isPending ? "Daxil olunur..." : "Daxil ol"}
                  </button>
                </form>
            {/* Security notice */}
            <p style={{ marginTop: '32px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Daxil olaraq <a href="#" style={{ color: '#64748b', textDecoration: 'underline' }}>Təhlükəsizlik Siyasəti</a>ni qəbul edirsiniz.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ padding: '16px 48px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
              <span style={{ color: '#fff', fontSize: '8px', fontWeight: 'bold' }}>DK</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              DK Agency — Restoran Operasyon Texnologiyaları
            </p>
          </div>
          <a
            href="#"
            style={{ fontSize: '12px', fontWeight: 500, color: '#C8102E', textDecoration: 'none' }}
          >
            Kömək lazımdır?
          </a>
        </div>
      </div>
    </main>
  )
}
