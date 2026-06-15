"use client";

import { useState } from "react";

export default function MezuniyyetPage() {
  const [saving, setSaving] = useState(false);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Məzuniyyət / İcazə Forması</h1>
      <p className="text-sm text-slate-500 mb-4">F07 — AR ƏM m.114: minimum 21 təqvim günü illik məzuniyyət</p>

      <form onSubmit={(e) => { e.preventDefault(); setSaving(true); setTimeout(() => { setSaving(false); alert("Məzuniyyət tələbi göndərildi!"); }, 1000); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">İşçi</label>
            <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
              <option>Əli Həsənov</option><option>Leyla Məmmədova</option><option>Orxan Kazımov</option>
              <option>Nigar Əliyeva</option><option>Tural İsmayılov</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Məzuniyyət növü</label>
            <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
              <option>İllik ödənişli məzuniyyət</option><option>Qısamüddətli icazə</option>
              <option>Xəstəlik vərəqəsi</option><option>Ödənişsiz məzuniyyət</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Başlama</label>
            <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Bitmə</label>
            <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">İşə qayıdış</label>
            <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-900 mb-1">Əvəz edəcək şəxs</label>
          <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
            <option>Seçin...</option><option>Əli Həsənov</option><option>Leyla Məmmədova</option>
            <option>Tural İsmayılov</option><option>Aynur Hüseynova</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-900 mb-1">Əlavə qeyd</label>
          <textarea rows={2} placeholder="Təcili əlaqə, ünvan və s."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 resize-none" />
        </div>

        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-xs text-slate-600">
          <p className="font-bold text-slate-900 mb-1">📋 Qalıq Günlər</p>
          <p>İllik haqq: <span className="font-bold">21 gün</span> | İstifadə olunmuş: <span className="font-bold">7 gün</span> | Qalıq: <span className="font-bold text-emerald-700">14 gün</span></p>
          <p className="mt-1 text-[10px] text-slate-400">ƏM m.122: Məzuniyyət haqqı başlamadan 3 gün öncə ödənilməlidir.</p>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-[var(--ocaq-red)] text-white font-bold rounded-xl text-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
          {saving ? "Göndərilir..." : "Məzuniyyət Tələbini Göndər"}
        </button>
      </form>
    </div>
  );
}
