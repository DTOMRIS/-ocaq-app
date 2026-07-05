"use client";

import { useState } from "react";
import Link from "next/link";

const ROLES = ["Baş Aşpaz", "Aşpaz", "Baş Ofisiant", "Ofisiant", "Barmen", "Kassir", "Təmizlikçi", "Sürücü"];
const LOCATIONS = ["Neftçilər filialı", "Nizami filialı", "Bülbül filialı"];

export default function YeniPersonelPage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    setTimeout(() => {
      setSaving(false);
      alert(`Əməkdaş əlavə edildi!\n${JSON.stringify(data, null, 2)}`);
    }, 1000);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/komanda"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Yeni Əməkdaş Əlavə Et
          </h1>
          <p className="text-sm text-slate-500">
            Portala dəvət linki avtomatik göndəriləcək
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Ad *
            </label>
            <input name="firstName" type="text" required placeholder="Əli"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Soyad *
            </label>
            <input name="lastName" type="text" required placeholder="Həsənov"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Telefon *
            </label>
            <input name="phone" type="tel" required placeholder="+994 50 123 45 67"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              E-poçt
            </label>
            <input name="email" type="email" placeholder="ali@example.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
        </div>

        {/* Role + Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Vəzifə *
            </label>
            <select name="role" required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]">
              <option value="">Seçin...</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Filial *
            </label>
            <select name="location" required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]">
              <option value="">Seçin...</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Start date + Salary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              İşə Başlama Tarixi *
            </label>
            <input name="startDate" type="date" required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Aylıq Maaş (AZN)
            </label>
            <input name="salary" type="number" step="10" placeholder="600"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
        </div>

        {/* ID / Document */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Şəxsiyyət Vəsiqəsi Nömrəsi
          </label>
          <input name="idNumber" type="text" placeholder="AZE12345678"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Foto
          </label>
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:border-[var(--ocaq-red)] hover:bg-rose-50/30 transition-all">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-sm text-slate-500">Foto çəkin və ya yükləyin</span>
            <input name="photo" type="file" accept="image/*" capture="user" className="hidden" />
          </label>
        </div>

        {/* Emergency contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Təcili Əlaqə (Ad)
            </label>
            <input name="emergencyName" type="text" placeholder="Yaxını"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Təcili Əlaqə (Telefon)
            </label>
            <input name="emergencyPhone" type="tel" placeholder="+994 50 ..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
        </div>

        {/* Portal access */}
        <label className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <div>
            <span className="text-sm font-semibold text-slate-900">
              Portala Dəvət Göndər
            </span>
            <p className="text-xs text-slate-500">
              Telefona SMS ilə giriş linki göndəriləcək
            </p>
          </div>
          <input name="sendInvite" type="checkbox" defaultChecked
            className="w-5 h-5 rounded accent-[var(--ocaq-red)]" />
        </label>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/komanda"
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl text-center text-sm hover:bg-slate-200 transition-colors">
            Ləğv et
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Saxlanır..." : "Əməkdaşı Əlavə Et"}
          </button>
        </div>
      </form>
    </div>
  );
}
