"use client";

import { useState, useCallback } from "react";
import { HACCP_SECTIONS } from "@/data/haccp-daily-checklist";

type Shift = "sabah" | "axsam";

interface ItemState {
  checked: boolean;
  value: string;
  note: string;
  photoUrl?: string;
  timestamp?: string;
}

const WHEN_LABEL = { opening: "Açılış", ongoing: "Gün ərzində", closing: "Kapanış", both: "Hər iki vardiya" };

export default function HaccpPage() {
  const [shift, setShift] = useState<Shift>("sabah");
  const [inspector, setInspector] = useState("");
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [openSection, setOpenSection] = useState<string>("thermometer");

  const getItem = (id: string): ItemState =>
    items[id] ?? { checked: false, value: "", note: "" };

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        checked: !prev[id]?.checked,
        value: prev[id]?.value ?? "",
        note: prev[id]?.note ?? "",
        timestamp: new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }),
      },
    }));
  }, []);

  const setValue = useCallback((id: string, value: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id] ?? { checked: false, note: "" }, value },
    }));
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id] ?? { checked: false, value: "" }, note },
    }));
  }, []);

  const handlePhoto = useCallback((id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id] ?? { checked: false, value: "", note: "" }, photoUrl: url },
    }));
  }, []);

  const totalCritical = HACCP_SECTIONS.reduce((s, sec) => s + sec.items.filter((i) => i.critical).length, 0);
  const checkedCritical = HACCP_SECTIONS.reduce(
    (s, sec) => s + sec.items.filter((i) => i.critical && getItem(i.id).checked).length, 0
  );
  const totalItems = HACCP_SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const checkedCount = Object.values(items).filter((i) => i.checked).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const criticalPct = totalCritical > 0 ? Math.round((checkedCritical / totalCritical) * 100) : 0;

  const handleSubmit = () => {
    if (criticalPct < 100) {
      alert(`⚠️ DİQQƏT: ${totalCritical - checkedCritical} kritik CCP maddəsi tamamlanmayıb!\n\nBütün kritik maddələr (🔴) tamamlanmadan rapor göndərilə bilməz.`);
      return;
    }
    alert(`HACCP Raporu göndərildi!\n\nÜmumi: ${checkedCount}/${totalItems} (${pct}%)\nKritik CCP: ${checkedCritical}/${totalCritical} (${criticalPct}%)\nYoxlayan: ${inspector}\nVardiya: ${shift === "sabah" ? "Sabah" : "Axşam"}`);
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Qida Təhlükəsizliyi</h1>
          <p className="text-sm text-slate-500">Food Safety — Gündəlik HACCP/CCP Yoxlaması</p>
        </div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-full ${
          criticalPct === 100 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}>
          CCP {criticalPct}%
        </div>
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-500 mb-1">Ümumi</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs font-bold text-slate-700 mt-1">{checkedCount}/{totalItems}</p>
        </div>
        <div className={`rounded-xl border p-3 ${criticalPct === 100 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-[10px] text-slate-500 mb-1">Kritik CCP 🔴</p>
          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${criticalPct === 100 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${criticalPct}%` }} />
          </div>
          <p className="text-xs font-bold mt-1">{checkedCritical}/{totalCritical}</p>
        </div>
      </div>

      {/* Shift + Inspector */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setShift("sabah")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${shift === "sabah" ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
          ☀️ Sabah
        </button>
        <button onClick={() => setShift("axsam")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${shift === "axsam" ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"}`}>
          🌙 Axşam
        </button>
      </div>
      <input type="text" placeholder="Yoxlayan şəxs (ad soyad)" value={inspector} onChange={(e) => setInspector(e.target.value)}
        className="w-full px-4 py-3 mb-4 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]" />

      {/* Sections */}
      <div className="space-y-2">
        {HACCP_SECTIONS.map((section) => {
          const sChecked = section.items.filter((i) => getItem(i.id).checked).length;
          const sCriticalTotal = section.items.filter((i) => i.critical).length;
          const sCriticalDone = section.items.filter((i) => i.critical && getItem(i.id).checked).length;
          const isOpen = openSection === section.id;

          return (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setOpenSection(isOpen ? "" : section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="text-xl">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 text-sm">{section.title}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{WHEN_LABEL[section.when]}</span>
                    {sCriticalTotal > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sCriticalDone === sCriticalTotal ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        CCP {sCriticalDone}/{sCriticalTotal}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${sChecked === section.items.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {sChecked === section.items.length ? "✓" : `${sChecked}/${section.items.length}`}
                </span>
                <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100">
                  {section.items.map((item, idx) => {
                    const state = getItem(item.id);
                    return (
                      <div key={item.id} className={`px-4 py-3 ${idx < section.items.length - 1 ? "border-b border-slate-50" : ""}`}>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={state.checked} onChange={() => toggleItem(item.id)}
                            className="mt-0.5 w-5 h-5 rounded accent-[var(--ocaq-red)] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {item.critical && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                              <span className={`text-sm leading-snug ${state.checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {item.label}
                              </span>
                            </div>
                            {item.target && (
                              <span className="text-[10px] text-blue-600 font-medium">Hədəf: {item.target}</span>
                            )}
                          </div>
                          {state.timestamp && (
                            <span className="text-[10px] text-slate-400">{state.timestamp}</span>
                          )}
                        </label>

                        {state.checked && item.type === "temperature" && (
                          <div className="ml-8 mt-2">
                            <input type="text" placeholder={`Ölçülən dəyər (hədəf: ${item.target})`}
                              value={state.value} onChange={(e) => setValue(item.id, e.target.value)}
                              className="w-48 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
                          </div>
                        )}

                        {state.checked && item.requiresPhoto && (
                          <div className="ml-8 mt-2 flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200">
                              📷 Foto çək
                              <input type="file" accept="image/*" capture="environment" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(item.id, f); }} />
                            </label>
                            {state.photoUrl && <span className="text-xs text-emerald-600 font-medium">✓ Foto</span>}
                          </div>
                        )}

                        {state.checked && (
                          <div className="ml-8 mt-2">
                            <input type="text" placeholder="Qeyd (ixtiyari — problem varsa yazın)"
                              value={state.note} onChange={(e) => setNote(item.id, e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 mt-4 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3">
        <div className="flex items-center gap-3 max-w-2xl">
          <div className="flex-1 text-sm">
            <span className="font-bold text-slate-900">{checkedCount}</span>/<span className="text-slate-500">{totalItems}</span>
            {criticalPct < 100 && (
              <span className="text-red-600 text-xs ml-2">⚠️ {totalCritical - checkedCritical} CCP eksik</span>
            )}
          </div>
          <button onClick={handleSubmit} disabled={!inspector || criticalPct < 100}
            className="px-6 py-2.5 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm shadow-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
            HACCP Raporu Göndər
          </button>
        </div>
      </div>
    </div>
  );
}
