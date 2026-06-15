"use client";

import { useState } from "react";
import { TRIAL_CRITERIA } from "@/data/hr-forms";

export default function SinaqPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [period, setPeriod] = useState<"1" | "2" | "3">("1");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [decision, setDecision] = useState("");

  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);
  const maxScore = TRIAL_CRITERIA.length * 5;
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Sınaq Müddəti Dəyərləndirmə</h1>
      <p className="text-sm text-slate-500 mb-4">F13 — AR Əmək Məcəlləsi m.51, 3 aylıq (hər ay sonu)</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input type="text" placeholder="İşçi adı soyadı" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
        <div className="flex gap-1">
          {(["1", "2", "3"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium ${period === p ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
              {p}-ci ay
            </button>
          ))}
        </div>
      </div>

      {/* Score summary */}
      <div className={`rounded-xl border-2 p-4 mb-4 text-center ${pct >= 70 ? "bg-emerald-50 border-emerald-200" : pct >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-3xl font-bold text-slate-900">{totalScore} / {maxScore}</p>
        <p className="text-sm text-slate-500">{pct}% — {pct >= 70 ? "Yaxşı" : pct >= 50 ? "Orta" : "Zəif"}</p>
      </div>

      {/* Criteria */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center text-xs font-semibold text-slate-600">
            <span className="flex-1">Meyar</span>
            <span className="w-32 text-center">1-5 bal</span>
          </div>
        </div>
        {TRIAL_CRITERIA.map((c) => (
          <div key={c.id} className="px-4 py-3 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{c.label}</p>
                <p className="text-[10px] text-slate-400">{c.desc}</p>
              </div>
              <div className="flex gap-1 w-32 justify-center">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} onClick={() => setScores((p) => ({ ...p, [c.id]: v }))}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      scores[c.id] === v
                        ? v >= 4 ? "bg-emerald-500 text-white" : v >= 3 ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Qualitative */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-900 mb-1">Güclü tərəflər</label>
          <textarea rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="İşçinin güclü tərəflərini yazın..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-900 mb-1">İnkişafa ehtiyac olan sahələr</label>
          <textarea rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="Hansı sahələrdə təkmilləşmə lazımdır..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 resize-none" />
        </div>
      </div>

      {/* Decision (only for 3rd month) */}
      {period === "3" && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
          <h3 className="font-bold text-sm text-slate-900 mb-2">Yekun Qərar</h3>
          <div className="space-y-2">
            {[
              { id: "pass", label: "✅ Sınaq müddətini uğurla tamamladı — daimi statusa keçirilsin" },
              { id: "extend", label: "🔄 Sınaq müddəti uzadılsın (tərəflərin razılığı ilə)" },
              { id: "fail", label: "❌ Özünü doğrultmadı — müqavilə xitam edilsin (ƏM m.70-d)" },
              { id: "transfer", label: "↔️ Vəzifə dəyişikliyi tövsiyə olunur" },
            ].map((d) => (
              <label key={d.id} className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="decision" value={d.id} checked={decision === d.id}
                  onChange={() => setDecision(d.id)} className="mt-0.5 accent-[var(--ocaq-red)]" />
                <span className="text-sm text-slate-800">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => alert(`Dəyərləndirmə saxlanıldı!\nİşçi: ${employeeName}\nDövr: ${period}-ci ay\nXal: ${totalScore}/${maxScore} (${pct}%)`)}
        disabled={!employeeName || Object.keys(scores).length < TRIAL_CRITERIA.length}
        className="w-full py-3.5 bg-[var(--ocaq-red)] text-white font-bold rounded-xl text-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
        Dəyərləndirməni Saxla
      </button>
    </div>
  );
}
