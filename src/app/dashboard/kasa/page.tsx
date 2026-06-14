"use client";

import { useState, useMemo } from "react";

type Shift = "sabah" | "axsam";

const BANKNOTES = [
  { label: "200 ₼", value: 200 },
  { label: "100 ₼", value: 100 },
  { label: "50 ₼", value: 50 },
  { label: "20 ₼", value: 20 },
  { label: "10 ₼", value: 10 },
  { label: "5 ₼", value: 5 },
  { label: "1 ₼", value: 1 },
];

const COINS = [
  { label: "50 qəp", value: 0.5 },
  { label: "20 qəp", value: 0.2 },
  { label: "10 qəp", value: 0.1 },
  { label: "5 qəp", value: 0.05 },
];

export default function KasaPage() {
  const [shift, setShift] = useState<Shift>("sabah");
  const [cashier, setCashier] = useState("");

  // Z raporu
  const [zTotal, setZTotal] = useState("");
  const [cancelAmount, setCancelAmount] = useState("");
  const [cancelCount, setCancelCount] = useState("");

  // Kasa sayımı
  const [noteCounts, setNoteCounts] = useState<Record<number, string>>({});
  const [coinCounts, setCoinCounts] = useState<Record<number, string>>({});

  // Kart + digər
  const [creditCard, setCreditCard] = useState("");
  const [cashIn, setCashIn] = useState("");
  const [cashOut, setCashOut] = useState("");
  const [bankDeposit, setBankDeposit] = useState("");

  const noteTotal = useMemo(
    () =>
      BANKNOTES.reduce(
        (sum, b) => sum + (parseFloat(noteCounts[b.value] || "0") || 0) * b.value,
        0
      ),
    [noteCounts]
  );

  const coinTotal = useMemo(
    () =>
      COINS.reduce(
        (sum, c) => sum + (parseFloat(coinCounts[c.value] || "0") || 0) * c.value,
        0
      ),
    [coinCounts]
  );

  const physicalCash = noteTotal + coinTotal;
  const zTotalNum = parseFloat(zTotal) || 0;
  const creditCardNum = parseFloat(creditCard) || 0;
  const cashInNum = parseFloat(cashIn) || 0;
  const cashOutNum = parseFloat(cashOut) || 0;
  const expectedCash = zTotalNum - creditCardNum + cashInNum - cashOutNum;
  const cashDiff = physicalCash - expectedCash;

  const handleSubmit = () => {
    const report = {
      shift, cashier,
      date: new Date().toISOString(),
      zTotal: zTotalNum,
      cancelAmount: parseFloat(cancelAmount) || 0,
      cancelCount: parseInt(cancelCount) || 0,
      noteTotal, coinTotal, physicalCash,
      creditCard: creditCardNum,
      cashIn: cashInNum, cashOut: cashOutNum,
      bankDeposit: parseFloat(bankDeposit) || 0,
      expectedCash, cashDiff,
    };
    alert(`Kasa raporu göndərildi!\n\nFiziki kassa: ${physicalCash.toFixed(2)} ₼\nGözlənilən: ${expectedCash.toFixed(2)} ₼\nFərq: ${cashDiff >= 0 ? "+" : ""}${cashDiff.toFixed(2)} ₼`);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Günlük Kasa Raporu</h1>
      <p className="text-sm text-slate-500 mb-6">Z raporu + fiziki sayım + fərq hesablama</p>

      {/* Shift + Cashier */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShift("sabah")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${shift === "sabah" ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
          ☀️ Sabah
        </button>
        <button onClick={() => setShift("axsam")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${shift === "axsam" ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
          🌙 Axşam
        </button>
      </div>
      <input type="text" placeholder="Kassir adı soyadı" value={cashier} onChange={(e) => setCashier(e.target.value)}
        className="w-full px-4 py-3 mb-6 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />

      {/* Z Raporu */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <h2 className="font-bold text-slate-900 mb-3">📋 Z Raporu Məlumatları</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Z Raporu Cəm (₼)</label>
            <input type="number" step="0.01" value={zTotal} onChange={(e) => setZTotal(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">İptal Tutarı (₼)</label>
            <input type="number" step="0.01" value={cancelAmount} onChange={(e) => setCancelAmount(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">İptal Sayı</label>
            <input type="number" value={cancelCount} onChange={(e) => setCancelCount(e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
        </div>
      </div>

      {/* Fiziki Kasa Sayımı */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <h2 className="font-bold text-slate-900 mb-3">💵 Kağız Pul Sayımı</h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {BANKNOTES.map((b) => (
            <div key={b.value}>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 text-center">{b.label}</label>
              <input type="number" min="0" value={noteCounts[b.value] || ""} placeholder="0"
                onChange={(e) => setNoteCounts((p) => ({ ...p, [b.value]: e.target.value }))}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
            </div>
          ))}
        </div>
        <p className="text-right text-sm font-bold text-slate-900 mt-2">Cəm: {noteTotal.toFixed(2)} ₼</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <h2 className="font-bold text-slate-900 mb-3">🪙 Xırda Pul Sayımı</h2>
        <div className="grid grid-cols-4 gap-2">
          {COINS.map((c) => (
            <div key={c.value}>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 text-center">{c.label}</label>
              <input type="number" min="0" value={coinCounts[c.value] || ""} placeholder="0"
                onChange={(e) => setCoinCounts((p) => ({ ...p, [c.value]: e.target.value }))}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
            </div>
          ))}
        </div>
        <p className="text-right text-sm font-bold text-slate-900 mt-2">Cəm: {coinTotal.toFixed(2)} ₼</p>
      </div>

      {/* Kart + Giriş/Çıxış */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <h2 className="font-bold text-slate-900 mb-3">💳 Kart və Hərəkətlər</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kredit Kartı (₼)</label>
            <input type="number" step="0.01" value={creditCard} onChange={(e) => setCreditCard(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bankaya Yatırılan (₼)</label>
            <input type="number" step="0.01" value={bankDeposit} onChange={(e) => setBankDeposit(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kasa Giriş (₼)</label>
            <input type="number" step="0.01" value={cashIn} onChange={(e) => setCashIn(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kasa Çıxış (₼)</label>
            <input type="number" step="0.01" value={cashOut} onChange={(e) => setCashOut(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
          </div>
        </div>
      </div>

      {/* Result Card */}
      <div className={`rounded-2xl border-2 p-5 mb-6 ${
        Math.abs(cashDiff) < 0.01 ? "bg-emerald-50 border-emerald-200" :
        Math.abs(cashDiff) <= 5 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
      }`}>
        <h2 className="font-bold text-slate-900 mb-3">📊 Nəticə</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Fiziki Kassa</p>
            <p className="text-xl font-bold text-slate-900">{physicalCash.toFixed(2)} ₼</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Gözlənilən</p>
            <p className="text-xl font-bold text-slate-900">{expectedCash.toFixed(2)} ₼</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Fərq</p>
            <p className={`text-xl font-bold ${
              Math.abs(cashDiff) < 0.01 ? "text-emerald-700" :
              Math.abs(cashDiff) <= 5 ? "text-amber-700" : "text-red-700"
            }`}>
              {cashDiff >= 0 ? "+" : ""}{cashDiff.toFixed(2)} ₼
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={!cashier || !zTotal}
        className="w-full py-3.5 bg-[var(--ocaq-red)] text-white font-bold rounded-xl text-sm shadow-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
        Kasa Raportunu Göndər
      </button>
    </div>
  );
}
