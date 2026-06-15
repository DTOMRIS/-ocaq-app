"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { MEK_F08_SECTIONS } from "@/data/mek-f08-checklist";

type Shift = "sabah" | "axsam";

interface ItemState {
  checked: boolean;
  note: string;
  temperature?: string;
  photoUrl?: string;
}

export default function VardiyaChecklistPage() {
  const [shift, setShift] = useState<Shift>("sabah");
  const [completedBy, setCompletedBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [openSection, setOpenSection] = useState<string>("personal");
  const [items, setItems] = useState<Record<string, ItemState>>({});

  const getItem = (id: string): ItemState =>
    items[id] ?? { checked: false, note: "" };

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id], checked: !prev[id]?.checked, note: prev[id]?.note ?? "" },
    }));
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id] ?? { checked: false }, note },
    }));
  }, []);

  const setTemperature = useCallback((id: string, temperature: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id] ?? { checked: false, note: "" }, temperature },
    }));
  }, []);

  const handlePhoto = useCallback((id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setItems((prev) => ({
      ...prev,
      [id]: { ...prev[id] ?? { checked: false, note: "" }, photoUrl: url },
    }));
  }, []);

  // Skor hesablama
  const totalItems = MEK_F08_SECTIONS.reduce(
    (sum, s) => sum + s.items.length,
    0
  );
  const checkedCount = Object.values(items).filter((i) => i.checked).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const handleSubmit = () => {
    const report = {
      shift,
      completedBy,
      checkedBy,
      date: new Date().toISOString(),
      score: `${checkedCount}/${totalItems} (${pct}%)`,
      items,
    };
    // Gələcəkdə API-yə POST olacaq
    alert(
      `Checklist göndərildi!\n\nSkor: ${checkedCount}/${totalItems} (${pct}%)\nVardiya: ${shift === "sabah" ? "Sabah" : "Axşam"}\nEdən: ${completedBy}\nYoxlayan: ${checkedBy}`
    );
    // eslint-disable-next-line no-console
    console.log("Checklist report:", JSON.stringify(report, null, 2));
  };

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-sm"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900 text-lg leading-tight">
              Vardiya Checklist
            </h1>
            <p className="text-xs text-slate-500">MƏK F 08 — Əjdaha MMC</p>
          </div>
          {/* Skor badge */}
          <div
            className={`text-sm font-bold px-3 py-1.5 rounded-full ${
              pct === 100
                ? "bg-emerald-100 text-emerald-700"
                : pct >= 70
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {pct}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor:
                pct === 100
                  ? "#059669"
                  : pct >= 70
                    ? "#D97706"
                    : "var(--ocaq-red)",
            }}
          />
        </div>
      </header>

      {/* Meta: Vardiya + İsimler */}
      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setShift("sabah")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              shift === "sabah"
                ? "bg-[var(--ocaq-red)] text-white shadow-sm"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            ☀️ Sabah Vardiyası
          </button>
          <button
            onClick={() => setShift("axsam")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              shift === "axsam"
                ? "bg-[var(--ocaq-red)] text-white shadow-sm"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            🌙 Axşam Vardiyası
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Edən (ad soyad)"
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          />
          <input
            type="text"
            placeholder="Yoxlayan (müdür)"
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {MEK_F08_SECTIONS.map((section) => {
          const sectionChecked = section.items.filter(
            (i) => getItem(i.id).checked
          ).length;
          const isOpen = openSection === section.id;

          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() =>
                  setOpenSection(isOpen ? "" : section.id)
                }
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-xl">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 text-sm leading-tight">
                    {section.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sectionChecked}/{section.items.length} tamamlandı
                  </p>
                </div>
                {/* Mini progress */}
                <div className="flex items-center gap-2">
                  <div
                    className={`text-xs font-bold px-2 py-1 rounded-md ${
                      sectionChecked === section.items.length
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {sectionChecked === section.items.length ? "✓" : `${sectionChecked}/${section.items.length}`}
                  </div>
                  <span
                    className={`text-slate-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {/* Items */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {section.items.map((item, idx) => {
                    const state = getItem(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`px-4 py-3 ${
                          idx < section.items.length - 1
                            ? "border-b border-slate-50"
                            : ""
                        }`}
                      >
                        {/* Checkbox row */}
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.checked}
                            onChange={() => toggleItem(item.id)}
                            className="mt-0.5 w-5 h-5 rounded border-slate-300 text-[var(--ocaq-red)] focus:ring-[var(--ocaq-red)] accent-[var(--ocaq-red)] flex-shrink-0"
                          />
                          <span
                            className={`text-sm leading-snug ${
                              state.checked
                                ? "text-slate-400 line-through"
                                : "text-slate-800"
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>

                        {/* Temperature field */}
                        {item.temperatureField && state.checked && (
                          <div className="ml-8 mt-2">
                            <input
                              type="number"
                              placeholder="Temperatur °C"
                              value={state.temperature ?? ""}
                              onChange={(e) =>
                                setTemperature(item.id, e.target.value)
                              }
                              className="w-32 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30"
                            />
                          </div>
                        )}

                        {/* Photo button */}
                        {item.requiresPhoto && state.checked && (
                          <div className="ml-8 mt-2 flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                              📷 Foto çək
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhoto(item.id, file);
                                }}
                              />
                            </label>
                            {state.photoUrl && (
                              <span className="text-xs text-emerald-600 font-medium">
                                ✓ Foto əlavə edildi
                              </span>
                            )}
                          </div>
                        )}

                        {/* Note field */}
                        {state.checked && (
                          <div className="ml-8 mt-2">
                            <input
                              type="text"
                              placeholder="Qeyd (ixtiyari)"
                              value={state.note}
                              onChange={(e) => setNote(item.id, e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30"
                            />
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

      {/* Footer: Submit */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm text-slate-600">
            <span className="font-bold text-slate-900">{checkedCount}</span>/{totalItems} madde
          </div>
          <button
            onClick={handleSubmit}
            disabled={checkedCount === 0 || !completedBy}
            className="px-6 py-2.5 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Checklistı Göndər
          </button>
        </div>
      </div>
    </main>
  );
}
