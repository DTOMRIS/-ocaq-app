"use client";

import { useState } from "react";
import { ORIENTATION_SECTIONS } from "@/data/hr-forms";

type Dept = "all" | "kitchen" | "service";

export default function OryentasiyaPage() {
  const [dept, setDept] = useState<Dept>("kitchen");
  const [employeeName, setEmployeeName] = useState("");
  const [mentorName, setMentorName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openSection, setOpenSection] = useState("company");

  const visibleSections = ORIENTATION_SECTIONS.filter(
    (s) => s.for === "all" || s.for === dept
  );

  const totalItems = visibleSections.reduce((s, sec) => s + sec.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Oryantasiya Checklist</h1>
      <p className="text-sm text-slate-500 mb-4">F08-F09 — 3 günlük yeni işçi təlim proqramı</p>

      {/* Progress */}
      <div className={`rounded-xl border-2 p-3 mb-4 flex items-center gap-3 ${pct === 100 ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
        <div className={`text-lg font-bold ${pct === 100 ? "text-emerald-700" : "text-slate-900"}`}>{pct}%</div>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--ocaq-red)] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-slate-500">{checkedCount}/{totalItems}</span>
      </div>

      {/* Employee + Dept */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input type="text" placeholder="İşçi adı soyadı" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
        <input type="text" placeholder="Mentor adı" value={mentorName} onChange={(e) => setMentorName(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
      </div>
      <div className="flex gap-2 mb-4">
        {([["kitchen", "🍳 Mətbəx"], ["service", "🍽️ Zal / Bar"]] as const).map(([d, label]) => (
          <button key={d} onClick={() => setDept(d)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${dept === d ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {visibleSections.map((section) => {
          const sChecked = section.items.filter((_, i) => checked[`${section.id}-${i}`]).length;
          const isOpen = openSection === section.id;
          return (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setOpenSection(isOpen ? "" : section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <div className="flex-1">
                  <h2 className="font-semibold text-sm text-slate-900">{section.title}</h2>
                  <p className="text-[10px] text-slate-400">{sChecked}/{section.items.length} tamamlandı</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${sChecked === section.items.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {sChecked === section.items.length ? "✓" : `${sChecked}/${section.items.length}`}
                </span>
                <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100">
                  {section.items.map((item, idx) => {
                    const key = `${section.id}-${idx}`;
                    return (
                      <label key={key} className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50/50">
                        <input type="checkbox" checked={!!checked[key]}
                          onChange={() => setChecked((p) => ({ ...p, [key]: !p[key] }))}
                          className="mt-0.5 w-4 h-4 rounded accent-[var(--ocaq-red)]" />
                        <span className={`text-sm ${checked[key] ? "text-slate-400 line-through" : "text-slate-800"}`}>{item}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3 Gün Cədvəli */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mt-4">
        <h3 className="font-bold text-slate-900 text-sm mb-2">📅 3 Günlük Oryantasiya Cədvəli</h3>
        <div className="space-y-2 text-xs text-slate-700">
          <div><span className="font-bold">GÜN 1:</span> Şirkət tanıtımı, iş yerinin gəzilməsi, iş təhlükəsizliyi, HACCP baza, avadanlıq tanıtımı</div>
          <div><span className="font-bold">GÜN 2:</span> Menyu + reseptlər, allergen protokolu, POS sistemi, müştəri xidməti, praktiki məşq (mentor müşahidəsi)</div>
          <div><span className="font-bold">GÜN 3:</span> Real növbədə shadowing, açılış hazırlığı, pik vaxt təcrübəsi, bağlanış, yekun dəyərləndirmə</div>
        </div>
      </div>
    </div>
  );
}
