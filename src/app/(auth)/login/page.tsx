'use client'

import { useActionState, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from './actions'

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1200&q=80",
    alt: "Restoran mətbəxi — şef hazırlıq edir",
  },
  {
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    alt: "Restoran salonu — servis hazırlığı",
  },
  {
    url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80",
    alt: "Şef yemək hazırlayır",
  },
  {
    url: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=1200&q=80",
    alt: "Restoran komandası",
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
    <main className="flex-1 flex flex-col lg:flex-row min-h-screen bg-slate-900">
      {/* Left — Sliding Images */}
      <div className="relative w-full lg:w-1/2 h-64 sm:h-80 lg:h-auto overflow-hidden bg-slate-900">
        {SLIDES.map((slide, idx) => (
          <div
            key={slide.url}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: idx === currentSlide ? 1 : 0 }}
          >
            <img
              src={slide.url}
              alt={slide.alt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ))}

        {/* Slide dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-8 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        {/* Brand overlay on image */}
        <div className="absolute bottom-8 left-6 z-10 hidden lg:block">
          <p className="text-white/80 text-sm font-medium">
            Powered by DK Agency
          </p>
        </div>
      </div>

      {/* Right — Welcome + Login Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top bar: logo + language */}
        <div className="flex items-center justify-between px-6 py-4 lg:px-12 lg:py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--ocaq-red)] text-white text-lg font-bold">
              O
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              OCAQ
            </span>
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === l
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form area */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 pb-8">
          <div className="max-w-md mx-auto w-full lg:mx-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">
              Portal Girişi
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              Davam etmək üçün hesab məlumatlarınızı daxil edin
            </p>

            {/* Error message */}
            {state?.error && (
              <div className="mb-5 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700">
                <svg className="w-5 h-5 shrink-0 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {state.error}
              </div>
            )}

            {/* Form */}
            <form action={formAction} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-poçt
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Şifrə
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
                    className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <a href="/reset-password" className="text-xs text-slate-400 hover:text-[var(--ocaq-red)] transition-colors">
                  Şifrəni unutdunuz?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-[var(--ocaq-red)] text-white font-bold rounded-xl text-center text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-lg hover:shadow-rose-100/50 transition-all duration-300 cursor-pointer"
              >
                {isPending ? "Daxil olunur..." : "Daxil ol"}
              </button>
            </form>

            {/* Security notice */}
            <p className="mt-8 text-xs text-slate-400 text-center lg:text-left">
              Daxil olaraq{" "}
              <a href="#" className="underline hover:text-slate-500">
                Təhlükəsizlik Siyasəti
              </a>
              ni qəbul edirsiniz.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-6 lg:px-12 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">DK</span>
            </div>
            <p className="text-xs text-slate-400">
              DK Agency — Restoran Operasyon Texnologiyaları
            </p>
          </div>
          <a
            href="#"
            className="text-xs font-medium text-[var(--ocaq-red)] hover:underline"
          >
            Kömək lazımdır?
          </a>
        </div>
      </div>
    </main>
  )
}
