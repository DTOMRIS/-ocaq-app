"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { MEK_F08_SECTIONS } from "@/data/mek-f08-checklist";

type Shift = "sabah" | "axsam";

interface ItemState {
  checked: boolean;
  note: string;
  temperature?: string;
  photoKey?: string;
}

export default function VardiyaChecklistPage() {
  const [shift, setShift] = useState<Shift>("sabah");
  const [openSection, setOpenSection] = useState<string>("personal");
  const [items, setItems] = useState<Record<string, ItemState>>({});

  const [branches, setBranches] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadingPhotoIds, setUploadingPhotoIds] = useState<string[]>([]);
  const [pageError, setPageError] = useState("");
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    fetch("/api/checklists?view=branches")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Filiallar yüklənmədi");
        return data;
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setBranches(data);
          if (data.length > 0) {
            setSelectedBranchId(data[0].id);
          }
        }
      })
      .catch((err) => setPageError(err instanceof Error ? err.message : "Filiallar yüklənmədi"));
  }, []);

  const getItem = (id: string): ItemState =>
    items[id] ?? { checked: false, note: "" };

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => ({
      ...prev,
      [id]: prev[id]?.checked
        ? { checked: false, note: "" }
        : { ...prev[id], checked: true, note: prev[id]?.note ?? "" },
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

  const handlePhoto = useCallback(async (id: string, file: File) => {
    if (!selectedBranchId || uploadingPhotoIds.includes(id)) return;
    if (file.size > 5 * 1024 * 1024) {
      setPageError("Foto 5 MB-dan böyük ola bilməz");
      return;
    }

    setPageError("");
    setUploadingPhotoIds((current) => [...current, id]);
    try {
      const form = new FormData();
      form.set("branch_id", selectedBranchId);
      form.set("item_id", id);
      form.set("file", file);
      const response = await fetch("/api/upload/checklist-photo", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.key !== "string") {
        throw new Error(data.error ?? "Foto yüklənmədi");
      }
      setItems((prev) => ({
        ...prev,
        [id]: { ...prev[id] ?? { checked: true, note: "" }, photoKey: data.key },
      }));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Foto yüklənmədi");
    } finally {
      setUploadingPhotoIds((current) => current.filter((itemId) => itemId !== id));
    }
  }, [selectedBranchId, uploadingPhotoIds]);

  // Skor hesablama
  const totalItems = MEK_F08_SECTIONS.reduce(
    (sum, s) => sum + s.items.length,
    0
  );
  const checkedCount = Object.values(items).filter((i) => i.checked).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const missingRequiredCount = MEK_F08_SECTIONS.flatMap((section) => section.items).filter((item) => {
    const state = getItem(item.id);
    if (!state.checked) return false;
    return (item.temperatureField && !state.temperature?.trim()) || (item.requiresPhoto && !state.photoKey);
  }).length;

  const handleSubmit = async () => {
    if (submitLoading) return;
    if (!selectedBranchId) {
      setPageError("Zəhmət olmasa filial seçin");
      return;
    }
    if (uploadingPhotoIds.length > 0) {
      setPageError("Fotoların yüklənməsini gözləyin");
      return;
    }
    if (missingRequiredCount > 0) {
      setPageError("İşarələnmiş maddələrdə tələb olunan ölçü və fotoları tamamlayın");
      return;
    }

    setPageError("");
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          shift,
          idempotency_key: submissionKey,
          items,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Göndərmə zamanı xəta");
      }

      setItems({});
      setOpenSection("personal");
      setSubmissionKey(crypto.randomUUID());
      alert("Checklist uğurla bazaya qeyd olundu!");
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Göndərilmədi");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh]">
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
            {branches.length > 1 ? (
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setItems({});
                  setSubmissionKey(crypto.randomUUID());
                  setPageError("");
                }}
                className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none mt-1"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            ) : branches.length === 1 ? (
              <p className="text-xs text-slate-500">{branches[0].code} — {branches[0].name}</p>
            ) : (
              <p className="text-xs text-slate-500">Filial yüklənir...</p>
            )}
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

      {/* Meta: Vardiya */}
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
        <p className="text-xs text-slate-500">
          Dolduran menecer və Bakı iş tarixi sistem tərəfindən avtomatik qeyd olunur.
        </p>
      </div>

      {pageError && (
        <div role="alert" className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {pageError}
        </div>
      )}

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
                                disabled={uploadingPhotoIds.includes(item.id)}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhoto(item.id, file);
                                }}
                              />
                            </label>
                            {uploadingPhotoIds.includes(item.id) ? (
                              <span className="text-xs text-slate-500 font-medium">
                                Yüklənir...
                              </span>
                            ) : state.photoKey && (
                              <span className="text-xs text-emerald-600 font-medium">
                                ✓ Foto təhlükəsiz saxlanıldı
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
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-sm text-slate-600">
            <span className="font-bold text-slate-900">{checkedCount}</span>/{totalItems} maddə
            {missingRequiredCount > 0 && (
              <span className="block text-xs text-amber-700">{missingRequiredCount} tələb tamamlanmayıb</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={checkedCount === 0 || !selectedBranchId || submitLoading || uploadingPhotoIds.length > 0 || missingRequiredCount > 0}
            className="px-6 py-2.5 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {submitLoading ? "Göndərilir..." : "Checklistı Göndər"}
          </button>
        </div>
      </div>
    </main>
  );
}
