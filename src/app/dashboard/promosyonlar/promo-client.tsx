"use client";

import { useState } from "react";
import Link from "next/link";

export type Promo = {
  id: string;
  title: string;
  description: string;
  image: string;
  badge: string;
  badgeColor: string;
  validUntil: string | null;
  discountLabel: string;
  code: string;
};

export default function PromoClient({ promos, canManage }: { promos: Promo[]; canManage: boolean }) {
  const [selectedPromo, setSelectedPromo] = useState<string | null>(null);
  const selected = promos.find((p) => p.id === selectedPromo);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promosyonlar</h1>
          <p className="text-sm text-slate-500 mt-1">Aktiv endirim və kampaniyalar</p>
        </div>
        {canManage && (
          <Link
            href="/admin/promosyonlar/yeni"
            className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            + Yeni Promo
          </Link>
        )}
      </div>

      {promos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">🎁</p>
          <p className="text-slate-900 font-semibold">Hələ promosyon yoxdur</p>
          <p className="text-slate-500 text-sm mt-1">
            {canManage ? '"+ Yeni Promo" ilə ilk kampaniyanı yarat.' : 'Administrator kampaniya əlavə edəndə burada görünəcək.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((promo) => (
            <button
              key={promo.id}
              onClick={() => setSelectedPromo(promo.id)}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-[var(--ocaq-red)]/30 transition-all duration-300 text-left"
            >
              <div className="relative h-44 overflow-hidden">
                <img src={promo.image} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${promo.badgeColor}`}>{promo.badge}</span>
                </div>
                {promo.discountLabel && (
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg">
                    <span className="text-lg font-bold text-[var(--ocaq-red)]">{promo.discountLabel}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900 group-hover:text-[var(--ocaq-red)] transition-colors">{promo.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{promo.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{promo.validUntil ? `Son: ${new Date(promo.validUntil).toLocaleDateString("az-AZ")}` : "Müddətsiz"}</span>
                  {promo.code && <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{promo.code}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPromo(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-48">
              <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full mb-2 ${selected.badgeColor}`}>{selected.badge}</span>
                <h2 className="text-xl font-bold text-white">{selected.title}</h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">{selected.description}</p>
              <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center mb-4">
                <div className="w-40 h-40 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-3">
                  <div className="text-center">
                    <p className="text-4xl mb-1">📱</p>
                    <p className="text-[10px] text-slate-400">QR Kod</p>
                  </div>
                </div>
                {selected.code && <p className="text-lg font-mono font-bold text-slate-900 tracking-widest">{selected.code}</p>}
                <p className="text-xs text-slate-500 mt-1">Kassa bu kodu oxuyaraq endirimi tətbiq edir</p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                {selected.discountLabel && <span>Endirim: {selected.discountLabel}</span>}
                <span>{selected.validUntil ? `Son: ${new Date(selected.validUntil).toLocaleDateString("az-AZ")}` : "Müddətsiz"}</span>
              </div>
              <button onClick={() => setSelectedPromo(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
