"use client";

import { useState, useMemo } from "react";
import {
  FORECAST_FACTORS,
  DAY_COEFFICIENTS,
  SPECIAL_DAYS,
  calculateMonthlyForecast,
  calculateWMA,
  calculatePrepAmount,
} from "@/data/sales-forecast";

const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","İyun","İyul","Avqust","Sentyabr","Oktyabr","Noyabr","Dekabr"];
const DAYS = ["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."];

type Tab = "monthly" | "daily" | "prep";

export default function TahminPage() {
  const [tab, setTab] = useState<Tab>("monthly");

  // ═══ AYLIK ═══
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [lastYearSales, setLastYearSales] = useState("121350");
  const [factors, setFactors] = useState<Record<string, number>>(
    Object.fromEntries(FORECAST_FACTORS.map((f) => [f.id, f.defaultPct]))
  );

  const monthlyResult = useMemo(
    () => calculateMonthlyForecast(parseFloat(lastYearSales) || 0, factors),
    [lastYearSales, factors]
  );

  // ═══ GÜNLÜK ═══
  const [dailyData, setDailyData] = useState<Record<string, string>>({
    w1: "2800", w2: "2650", w3: "2900", w4: "2750",
  });
  const [selectedDay, setSelectedDay] = useState("C.");
  const [specialDay, setSpecialDay] = useState("");

  const dailyWMA = useMemo(() => {
    const weeks = [
      parseFloat(dailyData.w1) || 0,
      parseFloat(dailyData.w2) || 0,
      parseFloat(dailyData.w3) || 0,
      parseFloat(dailyData.w4) || 0,
    ];
    return calculateWMA(weeks);
  }, [dailyData]);

  const dayCoeff = DAY_COEFFICIENTS[selectedDay] || 1;
  const specialCoeff = specialDay ? SPECIAL_DAYS.find((s) => s.label === specialDay)?.coefficient || 1 : 1;
  const dailyForecast = dailyWMA * dayCoeff * specialCoeff;

  // ═══ HAZIRLAMA ═══
  const [forecastCovers, setForecastCovers] = useState("140");
  const [etPortion, setEtPortion] = useState("0.30");
  const [toyuqPortion, setToyuqPortion] = useState("0.20");
  const [etFire, setEtFire] = useState("25");
  const [toyuqFire, setToyuqFire] = useState("20");
  const [etPercent, setEtPercent] = useState("60");

  const etCovers = Math.round((parseFloat(forecastCovers) || 0) * (parseFloat(etPercent) || 0) / 100);
  const toyuqCovers = (parseFloat(forecastCovers) || 0) - etCovers;

  const etPrep = useMemo(() => calculatePrepAmount(etCovers, parseFloat(etPortion) || 0, (parseFloat(etFire) || 0) / 100), [etCovers, etPortion, etFire]);
  const toyuqPrep = useMemo(() => calculatePrepAmount(toyuqCovers, parseFloat(toyuqPortion) || 0, (parseFloat(toyuqFire) || 0) / 100), [toyuqCovers, toyuqPortion, toyuqFire]);

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 placeholder:text-slate-400";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Satış Təxminləri</h1>
      <p className="text-sm text-slate-500 mb-4">Aylıq faktor sistemi + günlük WMA + ət/toyuq hazırlama miqdarı</p>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {([
          ["monthly", "📊 Aylıq Təxmin"],
          ["daily", "📅 Günlük Təxmin"],
          ["prep", "🥩 Hazırlama Miqdarı"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ AYLIK TƏXMİN ═══ */}
      {tab === "monthly" && (
        <div>
          {/* Ay + keçən il */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Planlanan Ay</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className={inputClass}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Keçən İlin Eyni Ay Satışı (₼)</label>
              <input type="number" value={lastYearSales} onChange={(e) => setLastYearSales(e.target.value)}
                placeholder="121350" className={inputClass} />
            </div>
          </div>

          {/* 10 Faktor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <h2 className="font-bold text-slate-900 mb-1">📋 Uyğunluq Faktorları (10)</h2>
            <p className="text-[10px] text-slate-400 mb-3">Hər faktor üçün müsbət (+) və ya mənfi (-) faiz daxil edin</p>

            <div className="space-y-2">
              {(["structural", "market", "external"] as const).map((cat) => {
                const catLabels = { structural: "Struktur", market: "Bazar", external: "Xarici" };
                const catFactors = FORECAST_FACTORS.filter((f) => f.category === cat);
                return (
                  <div key={cat}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">{catLabels[cat]}</p>
                    {catFactors.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">{f.label}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{f.description}</p>
                        </div>
                        <div className="flex items-center gap-1 w-28">
                          <span className="text-xs text-slate-400">%</span>
                          <input type="number" step="0.01" value={factors[f.id] || ""}
                            onChange={(e) => setFactors((p) => ({ ...p, [f.id]: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nəticə */}
          <div className={`rounded-2xl border-2 p-5 ${monthlyResult.adjustment >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <h2 className="font-bold text-slate-900 mb-3">📊 {MONTHS[selectedMonth]} Ayı Satış Təxmini</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">(A) Keçən ilin satışı</span>
                <span className="font-bold text-slate-900">{(parseFloat(lastYearSales) || 0).toLocaleString()} ₼</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Toplam faktor</span>
                <span className={`font-bold ${monthlyResult.totalFactorPct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {monthlyResult.totalFactorPct >= 0 ? "+" : ""}{monthlyResult.totalFactorPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(B) Əksetdirilən artma/düşmə</span>
                <span className={`font-bold ${monthlyResult.adjustment >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {monthlyResult.adjustment >= 0 ? "+" : ""}{monthlyResult.adjustment.toLocaleString(undefined, {maximumFractionDigits: 0})} ₼
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Planlanan satış (A+B)</span>
                <span className="text-xl font-bold text-slate-900">{monthlyResult.forecast.toLocaleString(undefined, {maximumFractionDigits: 0})} ₼</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GÜNLÜK TƏXMİN ═══ */}
      {tab === "daily" && (
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <h2 className="font-bold text-slate-900 mb-3">📅 Son 4 Həftənin Eyni Günü (₼)</h2>
            <p className="text-[10px] text-slate-400 mb-3">WMA formulu: ağırlıqlar [4, 3, 2, 1] — son həftə ən ağır</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                ["w1", "Son həftə (×4)"],
                ["w2", "2 həftə əvvəl (×3)"],
                ["w3", "3 həftə əvvəl (×2)"],
                ["w4", "4 həftə əvvəl (×1)"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">{label}</label>
                  <input type="number" value={dailyData[key] || ""} onChange={(e) => setDailyData((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="0" className={inputClass + " text-center"} />
                </div>
              ))}
            </div>
            <p className="text-right text-sm font-bold text-slate-900 mt-2">WMA ortalama: {dailyWMA.toFixed(0)} ₼</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Gün</label>
              <div className="flex gap-1">
                {DAYS.map((d) => (
                  <button key={d} onClick={() => setSelectedDay(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${selectedDay === d ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Katsayı: ×{dayCoeff.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Xüsusi gün (ixtiyari)</label>
              <select value={specialDay} onChange={(e) => setSpecialDay(e.target.value)} className={inputClass}>
                <option value="">Normal gün</option>
                {SPECIAL_DAYS.map((s) => (
                  <option key={s.label} value={s.label}>{s.label} (×{s.coefficient})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Günlük nəticə */}
          <div className="rounded-2xl border-2 bg-blue-50 border-blue-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Sabahkı Satış Təxmini ({selectedDay})</h2>
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-900">{dailyForecast.toLocaleString(undefined, {maximumFractionDigits: 0})} ₼</p>
              <p className="text-sm text-slate-500 mt-1">
                WMA {dailyWMA.toFixed(0)} × gün {dayCoeff} {specialDay && `× ${specialCoeff}`}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-blue-200">
              <div className="text-center">
                <p className="text-xs text-slate-500">Ort. Çek (22₼)</p>
                <p className="text-lg font-bold text-slate-900">{Math.round(dailyForecast / 22)} çek</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Müştəri (~1.2/çek)</p>
                <p className="text-lg font-bold text-slate-900">{Math.round(dailyForecast / 22 * 1.2)} nəfər</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Saatlıq pik</p>
                <p className="text-lg font-bold text-slate-900">{Math.round(dailyForecast / 22 * 0.25)}/saat</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HAZIRLAMA MİQDARI ═══ */}
      {tab === "prep" && (
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <h2 className="font-bold text-slate-900 mb-3">🥩 Sabahkı Ət / Toyuq Hazırlama</h2>
            <p className="text-[10px] text-slate-400 mb-3">Satış təxmini → resept çəkisi → fire nisbəti = brüt sipariş miqdarı</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Təxmini müştəri sayı</label>
                <input type="number" value={forecastCovers} onChange={(e) => setForecastCovers(e.target.value)}
                  placeholder="140" className={inputClass + " text-center"} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Ət dönər payı (%)</label>
                <input type="number" value={etPercent} onChange={(e) => setEtPercent(e.target.value)}
                  placeholder="60" className={inputClass + " text-center"} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Toyuq dönər payı (%)</label>
                <input type="number" value={String(100 - (parseFloat(etPercent) || 0))} disabled
                  className={inputClass + " text-center bg-slate-50"} />
              </div>
            </div>

            {/* Ət parametrləri */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-bold text-sm text-slate-900 mb-2">🥩 Ət Dönər</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Porsiya (kq)</label>
                    <input type="number" step="0.01" value={etPortion} onChange={(e) => setEtPortion(e.target.value)}
                      className={inputClass + " text-center"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Fire nisbəti (%)</label>
                    <input type="number" value={etFire} onChange={(e) => setEtFire(e.target.value)}
                      className={inputClass + " text-center"} />
                  </div>
                  <div className="pt-2 border-t border-red-200 text-center">
                    <p className="text-xs text-slate-500">Sifarişlər: {etCovers} ədəd</p>
                    <p className="text-xs text-slate-500">Net ehtiyac: {etPrep.netNeed.toFixed(1)} kq</p>
                    <p className="text-xl font-bold text-red-700 mt-1">{etPrep.grossOrder.toFixed(1)} kq</p>
                    <p className="text-[10px] text-slate-400">brüt sipariş (fire daxil)</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="font-bold text-sm text-slate-900 mb-2">🍗 Toyuq Dönər</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Porsiya (kq)</label>
                    <input type="number" step="0.01" value={toyuqPortion} onChange={(e) => setToyuqPortion(e.target.value)}
                      className={inputClass + " text-center"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Fire nisbəti (%)</label>
                    <input type="number" value={toyuqFire} onChange={(e) => setToyuqFire(e.target.value)}
                      className={inputClass + " text-center"} />
                  </div>
                  <div className="pt-2 border-t border-amber-200 text-center">
                    <p className="text-xs text-slate-500">Sifarişlər: {toyuqCovers} ədəd</p>
                    <p className="text-xs text-slate-500">Net ehtiyac: {toyuqPrep.netNeed.toFixed(1)} kq</p>
                    <p className="text-xl font-bold text-amber-700 mt-1">{toyuqPrep.grossOrder.toFixed(1)} kq</p>
                    <p className="text-[10px] text-slate-400">brüt sipariş (fire daxil)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sabah bildirişi */}
          <div className="rounded-2xl border-2 bg-emerald-50 border-emerald-200 p-5">
            <h2 className="font-bold text-slate-900 mb-2">📱 Sabah Hazırlama Bildirişi</h2>
            <div className="bg-white rounded-xl p-4 text-sm text-slate-800 space-y-1">
              <p className="font-bold">Sabah üçün ({DAYS[new Date().getDay() === 6 ? 0 : new Date().getDay()]}):</p>
              <p>🥩 Ət dönər: <span className="font-bold text-red-700">{etPrep.grossOrder.toFixed(1)} kq</span> hazırla ({etCovers} sifariş təxmini)</p>
              <p>🍗 Toyuq dönər: <span className="font-bold text-amber-700">{toyuqPrep.grossOrder.toFixed(1)} kq</span> hazırla ({toyuqCovers} sifariş təxmini)</p>
              <p>👥 Təxmini müştəri: <span className="font-bold">{forecastCovers}</span> nəfər</p>
              <p className="text-[10px] text-slate-400 pt-2">Bu təxmin son 4 həftənin datası + fire nisbəti əsasında hesablanıb</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
