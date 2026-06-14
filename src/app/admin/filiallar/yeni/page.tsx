"use client";

import { useState } from "react";
import Link from "next/link";

export default function YeniFilialPage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    setTimeout(() => { setSaving(false); alert(`Filial yaradıldı!\n${JSON.stringify(data, null, 2)}`); }, 1000);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/filiallar" className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yeni Filial Əlavə Et</h1>
          <p className="text-sm text-slate-500">Filial məlumatlarını doldurun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Filial Adı *</label>
          <input name="name" type="text" required placeholder="Məs: Yasamal Filialı"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Ünvan *</label>
          <input name="address" type="text" required placeholder="Küçə, nömrə, rayon"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Telefon *</label>
            <input name="phone" type="tel" required placeholder="+994 12 555 XX XX"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Müdür</label>
            <input name="manager" type="text" placeholder="Ad soyad"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Açılış Saatı</label>
            <input name="openTime" type="time" defaultValue="08:00"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Bağlanış Saatı</label>
            <input name="closeTime" type="time" defaultValue="23:00"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Oturma Yeri Sayı</label>
          <input name="seats" type="number" placeholder="60"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/admin/filiallar" className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl text-center text-sm hover:bg-slate-200">Ləğv et</Link>
          <button type="submit" disabled={saving} className="flex-1 py-3 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50">{saving ? "Saxlanır..." : "Filialı Əlavə Et"}</button>
        </div>
      </form>
    </div>
  );
}
