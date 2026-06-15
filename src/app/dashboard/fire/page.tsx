"use client";

import { useState, useMemo } from "react";

type ProteinType = "et" | "toyuq";

interface FireData {
  taxilanCiy: string;
  elaveCiy: string;
  qalanCiy: string;
  satilan: string;
  yemek: string;
  tullanti: string;
  strech: string;
  ikram: string;
  qalanBismis: string;
}

const EMPTY: FireData = {
  taxilanCiy: "", elaveCiy: "", qalanCiy: "",
  satilan: "", yemek: "", tullanti: "", strech: "", ikram: "", qalanBismis: "",
};

const BENCHMARK: Record<ProteinType, { min: number; max: number; label: string }> = {
  et: { min: 22, max: 28, label: "Ət dönər sektör standardı: %22-28" },
  toyuq: { min: 18, max: 22, label: "Toyuq dönər sektör standardı: %18-22" },
};

function calc(d: FireData) {
  const n = (v: string) => parseFloat(v) || 0;
  const istifade = n(d.taxilanCiy) + n(d.elaveCiy) - n(d.qalanCiy);
  const toplamBismis = n(d.satilan) + n(d.yemek) + n(d.tullanti) + n(d.strech) + n(d.ikram) + n(d.qalanBismis);
  const itki = istifade - toplamBismis;
  const firePct = istifade > 0 ? (itki / istifade) * 100 : 0;
  return { istifade, toplamBismis, itki, firePct };
}

export default function FirePage() {
  const [protein, setProtein] = useState<ProteinType>("et");
  const [et, setEt] = useState<FireData>(EMPTY);
  const [toyuq, setToyuq] = useState<FireData>(EMPTY);

  const data = protein === "et" ? et : toyuq;
  const setData = protein === "et" ? setEt : setToyuq;
  const result = useMemo(() => calc(data), [data]);
  const benchmark = BENCHMARK[protein];

  const update = (field: keyof FireData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const fireColor =
    result.firePct <= benchmark.min ? "text-emerald-700" :
    result.firePct <= benchmark.max ? "text-amber-700" : "text-red-700";

  const fireBg =
    result.firePct <= benchmark.min ? "bg-emerald-50 border-emerald-200" :
    result.firePct <= benchmark.max ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  const etResult = useMemo(() => calc(et), [et]);
  const toyuqResult = useMemo(() => calc(toyuq), [toyuq]);

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 placeholder:text-slate-300";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dönər İtki / Fire Hesablama</h1>
      <p className="text-sm text-slate-500 mb-4">Gündəlik ət və toyuq fire nisbəti — sektör benchmark ilə müqayisə</p>

      {/* Protein toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setProtein("et")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${protein === "et" ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
          🥩 Ət Dönər
        </button>
        <button onClick={() => setProtein("toyuq")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${protein === "toyuq" ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
          🍗 Toyuq Dönər
        </button>
      </div>

      {/* ÇİY İSTİFADƏ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-3">
        <h2 className="font-bold text-slate-900 mb-3">📥 Çiy İstifadə (kq)</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-40">Taxılan çiy baton</span>
            <span className="text-slate-400 w-4 text-center">+</span>
            <input type="number" step="0.01" value={data.taxilanCiy} onChange={(e) => update("taxilanCiy", e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-40">Əlavə çiy baton</span>
            <span className="text-slate-400 w-4 text-center">+</span>
            <input type="number" step="0.01" value={data.elaveCiy} onChange={(e) => update("elaveCiy", e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-40">Gün sonu qalan çiy</span>
            <span className="text-slate-400 w-4 text-center">−</span>
            <input type="number" step="0.01" value={data.qalanCiy} onChange={(e) => update("qalanCiy", e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-900 w-40">İSTİFADƏ</span>
            <span className="text-slate-400 w-4 text-center">=</span>
            <span className="text-lg font-bold text-slate-900">{result.istifade.toFixed(2)} kq</span>
          </div>
        </div>
      </div>

      {/* BİŞMİŞ PAYLANMA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-3">
        <h2 className="font-bold text-slate-900 mb-3">📤 Bişmiş Paylanma (kq)</h2>
        <div className="space-y-2">
          {([
            ["satilan", "Satılan", "+"],
            ["yemek", "Yemək (personel)", "+"],
            ["tullanti", "Tullantı", "+"],
            ["strech", "Strech (qaytarılan)", "+"],
            ["ikram", "İkram", "+"],
            ["qalanBismis", "Qalan bişmiş", "+"],
          ] as const).map(([field, label, op]) => (
            <div key={field} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-40">{label}</span>
              <span className="text-slate-400 w-4 text-center">{op}</span>
              <input type="number" step="0.01" value={data[field]} onChange={(e) => update(field, e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-900 w-40">TOPLAM BİŞMİŞ</span>
            <span className="text-slate-400 w-4 text-center">=</span>
            <span className="text-lg font-bold text-slate-900">{result.toplamBismis.toFixed(2)} kq</span>
          </div>
        </div>
      </div>

      {/* NƏTİCƏ */}
      <div className={`rounded-2xl border-2 p-5 mb-4 ${fireBg}`}>
        <h2 className="font-bold text-slate-900 mb-3">📊 Fire Nəticəsi — {protein === "et" ? "Ət Dönər" : "Toyuq Dönər"}</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">İstifadə</p>
            <p className="text-xl font-bold text-slate-900">{result.istifade.toFixed(2)} kq</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Toplam İtki</p>
            <p className="text-xl font-bold text-slate-900">{result.itki.toFixed(2)} kq</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Fire %</p>
            <p className={`text-2xl font-bold ${fireColor}`}>{result.firePct.toFixed(1)}%</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 text-center mt-3">
          {benchmark.label} —
          {result.firePct <= benchmark.min && " ✅ ƏLA"}
          {result.firePct > benchmark.min && result.firePct <= benchmark.max && " ⚠️ NORMAL"}
          {result.firePct > benchmark.max && " 🔴 YÜKSƏK — araşdır!"}
        </p>
      </div>

      {/* Günlük xülasə — hər iki protein */}
      {(etResult.istifade > 0 || toyuqResult.istifade > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="font-bold text-slate-900 mb-3">📋 Günlük Xülasə (hər iki dönər)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-semibold text-slate-500">Məhsul</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">İstifadə</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">Satılan</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">İtki</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500">Fire %</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-50">
                <td className="py-2 font-medium text-slate-900">🥩 Ət</td>
                <td className="py-2 text-right text-slate-700">{etResult.istifade.toFixed(2)}</td>
                <td className="py-2 text-right text-slate-700">{(parseFloat(et.satilan) || 0).toFixed(2)}</td>
                <td className="py-2 text-right text-slate-700">{etResult.itki.toFixed(2)}</td>
                <td className={`py-2 text-right font-bold ${etResult.firePct > 28 ? "text-red-700" : etResult.firePct > 22 ? "text-amber-700" : "text-emerald-700"}`}>
                  {etResult.firePct.toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-slate-900">🍗 Toyuq</td>
                <td className="py-2 text-right text-slate-700">{toyuqResult.istifade.toFixed(2)}</td>
                <td className="py-2 text-right text-slate-700">{(parseFloat(toyuq.satilan) || 0).toFixed(2)}</td>
                <td className="py-2 text-right text-slate-700">{toyuqResult.itki.toFixed(2)}</td>
                <td className={`py-2 text-right font-bold ${toyuqResult.firePct > 22 ? "text-red-700" : toyuqResult.firePct > 18 ? "text-amber-700" : "text-emerald-700"}`}>
                  {toyuqResult.firePct.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Submit */}
      <button onClick={() => alert(`Fire raporu göndərildi!\n\nƏt: ${etResult.firePct.toFixed(1)}% (${etResult.itki.toFixed(2)} kq itki)\nToyuq: ${toyuqResult.firePct.toFixed(1)}% (${toyuqResult.itki.toFixed(2)} kq itki)`)}
        className="w-full py-3.5 bg-[var(--ocaq-red)] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
        Fire Raportunu Göndər
      </button>
    </div>
  );
}
