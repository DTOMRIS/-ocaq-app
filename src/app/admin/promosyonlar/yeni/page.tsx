"use client";

import { useState } from "react";
import Link from "next/link";

type PromoType = "percent" | "bogo" | "fixed" | "gift";

const PROMO_TYPES: { id: PromoType; label: string; desc: string }[] = [
  { id: "percent", label: "Faiz Endirimi", desc: "Məs: 20% endirim" },
  { id: "bogo", label: "2 al 1 ödə", desc: "Buy one get one free" },
  { id: "fixed", label: "Sabit Endirim", desc: "Məs: 5 AZN endirim" },
  { id: "gift", label: "Hədiyyə Məhsul", desc: "Məs: pulsuz içki" },
];

export default function YeniPromoPage() {
  const [promoType, setPromoType] = useState<PromoType>("percent");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Gələcəkdə Supabase-ə POST olacaq
    setTimeout(() => {
      setSaving(false);
      alert(
        `Promo yaradıldı!\n${JSON.stringify(data, null, 2)}`
      );
    }, 1000);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/promosyonlar"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Yeni Promosyon Yarat
          </h1>
          <p className="text-sm text-slate-500">
            Bütün sahələri doldurun — personelə avtomatik görünəcək
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Promo Type */}
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900 mb-3">
            Promosyon Tipi
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {PROMO_TYPES.map((t) => (
              <label
                key={t.id}
                className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  promoType === t.id
                    ? "border-[var(--ocaq-red)] bg-rose-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="promoType"
                  value={t.id}
                  checked={promoType === t.id}
                  onChange={() => setPromoType(t.id)}
                  className="sr-only"
                />
                <span className="font-semibold text-sm text-slate-900">
                  {t.label}
                </span>
                <span className="text-xs text-slate-500">{t.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Başlıq *
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="Məs: Ailə Paketi — 20% Endirim"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Açıqlama *
          </label>
          <textarea
            name="description"
            required
            rows={3}
            placeholder="Kampaniyanın şərtlərini yazın..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] resize-none"
          />
        </div>

        {/* Discount value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              {promoType === "percent"
                ? "Endirim Faizi (%)"
                : promoType === "fixed"
                  ? "Endirim Məbləği (AZN)"
                  : promoType === "bogo"
                    ? "Neçə al? (ədəd)"
                    : "Hədiyyə Məhsul Adı"}
            </label>
            <input
              name="discountValue"
              type={promoType === "gift" ? "text" : "number"}
              required
              placeholder={
                promoType === "percent"
                  ? "20"
                  : promoType === "fixed"
                    ? "5.00"
                    : promoType === "bogo"
                      ? "2"
                      : "Pulsuz çay"
              }
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Promo Kodu
            </label>
            <input
              name="code"
              type="text"
              required
              placeholder="AILE20"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] font-mono uppercase"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Başlama Tarixi *
            </label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Bitmə Tarixi *
            </label>
            <input
              name="endDate"
              type="date"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
        </div>

        {/* Time restriction */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Saat Başlanğıc (ixtiyari)
            </label>
            <input
              name="startTime"
              type="time"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Saat Bitiş (ixtiyari)
            </label>
            <input
              name="endTime"
              type="time"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Şəkil
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:border-[var(--ocaq-red)] hover:bg-rose-50/30 transition-all">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-sm text-slate-500">
              Şəkil yükləyin və ya çəkin
            </span>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="hidden"
            />
          </label>
        </div>

        {/* Applicable days */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Keçərli Günlər
          </label>
          <div className="flex flex-wrap gap-2">
            {["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."].map((day) => (
              <label
                key={day}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-[var(--ocaq-red)] transition-colors"
              >
                <input
                  type="checkbox"
                  name="days"
                  value={day}
                  defaultChecked
                  className="w-3.5 h-3.5 rounded accent-[var(--ocaq-red)]"
                />
                <span className="text-xs font-medium text-slate-700">
                  {day}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Filial
          </label>
          <select
            name="location"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          >
            <option value="all">Bütün filialllar</option>
            <option value="neftciler">Neftçilər filialı</option>
            <option value="nizami">Nizami filialı</option>
            <option value="bulbul">Bülbül filialı</option>
          </select>
        </div>

        {/* Active toggle */}
        <label className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <div>
            <span className="text-sm font-semibold text-slate-900">
              Dərhal Aktivləşdir
            </span>
            <p className="text-xs text-slate-500">
              Personel dərhal görəcək və QR paylaşa biləcək
            </p>
          </div>
          <input
            name="isActive"
            type="checkbox"
            defaultChecked
            className="w-5 h-5 rounded accent-[var(--ocaq-red)]"
          />
        </label>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/dashboard/promosyonlar"
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl text-center text-sm hover:bg-slate-200 transition-colors"
          >
            Ləğv et
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saxlanır..." : "Promonu Yarat"}
          </button>
        </div>
      </form>
    </div>
  );
}
