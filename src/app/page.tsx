"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1200&q=80",
    alt: "Restoran mutfağı — şef hazırlık yapır",
  },
  {
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    alt: "Restoran salonu — servis hazırlığı",
  },
  {
    url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80",
    alt: "Şef yemek hazırlayır",
  },
  {
    url: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=1200&q=80",
    alt: "Restoran komandası",
  },
];

const ROLES = [
  {
    id: "personel",
    title: "Personel",
    desc: "Aşpaz, ofisiant, barmen və digər əməkdaşlar",
    icon: "👤",
  },
  {
    id: "mudur",
    title: "Restoran Müdürü",
    desc: "Filial müdürləri, növbə rəhbərləri və baş menecerlər",
    icon: "👔",
  },
  {
    id: "admin",
    title: "Şirkət İdarəçisi",
    desc: "Sahiblər, operasyon direktorları və konsultantlar",
    icon: "🏢",
  },
];

const LANGS = ["AZ", "TR", "EN", "RU"] as const;

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lang, setLang] = useState<(typeof LANGS)[number]>("AZ");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const selectedRoleData = ROLES.find((r) => r.id === selectedRole);

  return (
    <main className="flex-1 flex flex-col lg:flex-row min-h-screen">
      {/* Left — Sliding Images */}
      <div className="relative w-full lg:w-1/2 h-64 sm:h-80 lg:h-auto overflow-hidden bg-slate-900 flex-shrink-0">
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
          <p className="text-white/80 text-sm font-medium tracking-wide">
            Powered by DK Agency
          </p>
        </div>
      </div>

      {/* Right — Welcome + Role Selection / Login */}
      <div className="flex-1 flex flex-col bg-white min-h-0">
        {/* Top bar: logo + language */}
        <div className="flex items-center justify-between px-6 py-4 lg:px-12 lg:py-6 flex-shrink-0">
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

        {/* Content area */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 pb-6 overflow-y-auto">
          <div className="max-w-md mx-auto w-full lg:mx-0">
            {!selectedRole ? (
              <>
                {/* === STEP 1: Role Selection === */}
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                  Xoş gəldiniz,
                </h1>
                <p className="text-slate-500 text-base mb-8">
                  Başlamaq üçün rolunuzu seçin:
                </p>

                <div className="space-y-3">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className="group w-full flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-white hover:border-[var(--ocaq-red)] hover:shadow-lg hover:shadow-rose-100/50 transition-all duration-300 text-left"
                    >
                      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-white text-2xl shadow-sm group-hover:scale-110 transition-transform">
                        {role.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-slate-900 group-hover:text-[var(--ocaq-red)] transition-colors">
                          {role.title}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {role.desc}
                        </p>
                      </div>
                      <span className="text-slate-300 group-hover:text-[var(--ocaq-red)] group-hover:translate-x-1 transition-all text-lg">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* === STEP 2: Login Form === */}
                <button
                  onClick={() => setSelectedRole(null)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--ocaq-red)] mb-6 transition-colors"
                >
                  <span>←</span>
                  <span>Geri qayıt</span>
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-2xl">
                    {selectedRoleData?.icon}
                  </span>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {selectedRoleData?.title}
                    </h1>
                    <p className="text-sm text-slate-500">
                      {selectedRoleData?.desc}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.href = "/vardiya-checklist";
                  }}
                  className="space-y-4"
                >
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      İstifadəçi adı
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] transition-all"
                      placeholder="ad.soyad"
                    />
                    <a
                      href="#"
                      className="inline-block mt-1.5 text-xs text-[var(--ocaq-red)] hover:underline"
                    >
                      İstifadəçi adını unutdunuz?
                    </a>
                  </div>

                  {/* Remember me */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={() => setRemember(!remember)}
                      className="w-4 h-4 rounded border-slate-300 accent-[var(--ocaq-red)]"
                    />
                    <span className="text-sm text-slate-700">
                      Məni xatırla
                    </span>
                  </label>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Şifrə
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] transition-all"
                      placeholder="••••••••"
                    />
                    <a
                      href="#"
                      className="inline-block mt-1.5 text-xs text-[var(--ocaq-red)] hover:underline"
                    >
                      Şifrəni unutdunuz?
                    </a>
                  </div>

                  {/* Submit */}
                  <Link
                    href="/vardiya-checklist"
                    className="block w-full py-3.5 bg-[var(--ocaq-red)] text-white font-bold rounded-xl text-center text-sm shadow-sm hover:opacity-90 hover:shadow-lg hover:shadow-rose-200/50 transition-all duration-300"
                  >
                    Daxil ol
                  </Link>
                </form>
              </>
            )}

            {/* Security notice */}
            <p className="mt-8 text-xs text-slate-400 text-center lg:text-left">
              Daxil olaraq{" "}
              <a href="#" className="underline hover:text-slate-600">
                Təhlükəsizlik Siyasəti
              </a>
              ni qəbul edirsiniz.
            </p>
          </div>
        </div>

        {/* Bottom bar — DK Agency branding */}
        <div className="px-6 lg:px-12 py-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--ocaq-navy)] flex items-center justify-center">
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
  );
}
