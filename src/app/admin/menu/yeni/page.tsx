"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  "Əsas Yeməklər",
  "Şorba",
  "Salat",
  "Qarnir",
  "Desertlər",
  "İçkilər",
  "Uşaq Menyusu",
  "Səhər Yeməyi",
];

export default function YeniMenuItemPage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    setTimeout(() => {
      setSaving(false);
      alert(`Məhsul yaradıldı!\n${JSON.stringify(data, null, 2)}`);
    }, 1000);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/menu"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Yeni Menyu Məhsulu
          </h1>
          <p className="text-sm text-slate-500">
            Məhsul əlavə edin — bütün filiallar görəcək
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Məhsul Adı *
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Məs: Toyuq Dönər Lavaş 300qr"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Kateqoriya *
          </label>
          <select
            name="category"
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          >
            <option value="">Seçin...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Təsvir
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="Tərkibi, porsiya ölçüsü, allergen məlumatları..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)] resize-none"
          />
        </div>

        {/* Price + Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Satış Qiyməti (AZN) *
            </label>
            <input
              name="price"
              type="number"
              step="0.01"
              required
              placeholder="8.50"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Maya Dəyəri (AZN)
            </label>
            <input
              name="cost"
              type="number"
              step="0.01"
              placeholder="3.20"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Food cost avtomatik hesablanacaq
            </p>
          </div>
        </div>

        {/* Weight + Calories */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Çəki (qram)
            </label>
            <input
              name="weight"
              type="number"
              placeholder="300"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Kalori (kcal)
            </label>
            <input
              name="calories"
              type="number"
              placeholder="450"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
            />
          </div>
        </div>

        {/* Allergens */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Allergenlər
          </label>
          <div className="flex flex-wrap gap-2">
            {["Glüten", "Süd", "Yumurta", "Qoz-fındıq", "Soya", "Balıq", "Susam"].map(
              (allergen) => (
                <label
                  key={allergen}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-[var(--ocaq-red)] transition-colors"
                >
                  <input
                    type="checkbox"
                    name="allergens"
                    value={allergen}
                    className="w-3.5 h-3.5 rounded accent-[var(--ocaq-red)]"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    {allergen}
                  </span>
                </label>
              )
            )}
          </div>
        </div>

        {/* Prep time */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Hazırlama Müddəti (dəqiqə)
          </label>
          <input
            name="prepTime"
            type="number"
            placeholder="10"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Şəkil
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:border-[var(--ocaq-red)] hover:bg-rose-50/30 transition-all">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-sm text-slate-500">
              Məhsul şəklini yükləyin
            </span>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="hidden"
            />
          </label>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <span className="text-sm font-semibold text-slate-900">
                Menyuda Aktiv
              </span>
              <p className="text-xs text-slate-500">
                Söndürsəniz müştərilərə göstərilməyəcək
              </p>
            </div>
            <input
              name="isActive"
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded accent-[var(--ocaq-red)]"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <span className="text-sm font-semibold text-slate-900">
                Populyar / Tövsiyə Olunan
              </span>
              <p className="text-xs text-slate-500">
                Menyunun üstündə vurğulanacaq
              </p>
            </div>
            <input
              name="isFeatured"
              type="checkbox"
              className="w-5 h-5 rounded accent-[var(--ocaq-red)]"
            />
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/dashboard/menu"
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl text-center text-sm hover:bg-slate-200 transition-colors"
          >
            Ləğv et
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saxlanır..." : "Məhsulu Əlavə Et"}
          </button>
        </div>
      </form>
    </div>
  );
}
