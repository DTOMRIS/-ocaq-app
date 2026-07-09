"use client";

import { useState } from "react";
import { EQUIPMENT_CATALOG, EXTERNAL_SERVICES, FREQ_LABEL, type EquipmentType } from "@/data/equipment-catalog";

interface StoreEquipment {
  catalogId: string;
  nickname: string; // "Fritöz 1", "Fritöz 2" gibi
  brand?: string;
  model?: string;
  assignedTo: string;
  installDate: string;
}

const LOCATIONS = ["Neftçilər filialı", "Nizami filialı", "Bülbül filialı"];
const STAFF = ["Əli Həsənov", "Orxan Kazımov", "Tural İsmayılov", "Texnik Elmar", "Xarici Firma"];

export default function AdminEkipmanPage() {
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [storeEquipment, setStoreEquipment] = useState<StoreEquipment[]>([
    { catalogId: "doner-ocagi", nickname: "Dönər Ocağı 1", brand: "Potis", assignedTo: "Əli Həsənov", installDate: "2024-01-15" },
    { catalogId: "doner-ocagi", nickname: "Dönər Ocağı 2", brand: "Potis", assignedTo: "Əli Həsənov", installDate: "2024-01-15" },
    { catalogId: "fritoz", nickname: "Fritöz 1", brand: "Henny Penny", assignedTo: "Tural İsmayılov", installDate: "2024-03-01" },
    { catalogId: "espresso-makinesi", nickname: "La Marzocco", brand: "La Marzocco", model: "Linea Mini", assignedTo: "Orxan Kazımov", installDate: "2025-02-01" },
    { catalogId: "walkin-soyuducu", nickname: "Walk-in Ana", brand: "Coldline", assignedTo: "Texnik Elmar", installDate: "2023-06-01" },
    { catalogId: "klima-kaset", nickname: "Salon Klima 1", brand: "Daikin", model: "FCAG140B", assignedTo: "Xarici Firma", installDate: "2023-06-01" },
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newAssigned, setNewAssigned] = useState(STAFF[0]);
  const [expandedEquip, setExpandedEquip] = useState<string | null>(null);

  const categories = [...new Set(EQUIPMENT_CATALOG.map((e) => e.category))];

  const addEquipment = () => {
    if (!selectedCatalog || !newNickname.trim()) return;
    setStoreEquipment((prev) => [
      ...prev,
      {
        catalogId: selectedCatalog,
        nickname: newNickname.trim(),
        brand: newBrand || undefined,
        model: newModel || undefined,
        assignedTo: newAssigned,
        installDate: new Date().toISOString().slice(0, 10),
      },
    ]);
    setShowAdd(false);
    setNewNickname("");
    setNewBrand("");
    setNewModel("");
    setSelectedCatalog("");
  };

  const removeEquipment = (idx: number) => {
    setStoreEquipment((prev) => prev.filter((_, i) => i !== idx));
  };

  const getCatalogItem = (id: string): EquipmentType | undefined =>
    EQUIPMENT_CATALOG.find((e) => e.id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ekipman İdarəetmə</h1>
          <p className="text-sm text-slate-500 mt-1">Filial bazlı ekipman tanımlama + bakım checklist-i</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
          {showAdd ? "✕ Bağla" : "+ Ekipman Əlavə Et"}
        </button>
      </div>

      {/* Location selector */}
      <div className="flex gap-2 mb-4">
        {LOCATIONS.map((loc) => (
          <button key={loc} onClick={() => setLocation(loc)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location === loc ? "bg-[var(--ocaq-red)] text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}>
            📍 {loc.replace(" filialı", "")}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 space-y-4">
          <h3 className="font-bold text-slate-900">Kataloqdan Ekipman Seç</h3>

          {/* Category → Equipment selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Ekipman Tipi</label>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT_CATALOG.filter((e) => e.category === cat).map((eq) => (
                      <button key={eq.id} onClick={() => { setSelectedCatalog(eq.id); setNewNickname(eq.name); }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedCatalog === eq.id
                            ? "bg-[var(--ocaq-red)] text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}>
                        {eq.icon} {eq.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCatalog && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ad / Ləqəb *</label>
                  <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="Fritöz 1" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marka</label>
                  <input type="text" value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Henny Penny" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input type="text" value={newModel} onChange={(e) => setNewModel(e.target.value)}
                    placeholder="OFE-322" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30" />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Məsul Şəxs</label>
                  <select value={newAssigned} onChange={(e) => setNewAssigned(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
                    {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={addEquipment} disabled={!newNickname.trim()}
                  className="px-6 py-2.5 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40">
                  Əlavə Et
                </button>
              </div>

              {/* Preview: bu ekipmanın bakım checklist-i */}
              <div className="bg-slate-50 rounded-xl p-3 mt-2">
                <p className="text-xs font-bold text-slate-700 mb-2">Bu ekipmanın bakım checklist-i ({getCatalogItem(selectedCatalog)?.maintenance.length} maddə):</p>
                <div className="space-y-1">
                  {getCatalogItem(selectedCatalog)?.maintenance.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      {m.critical && <span className="text-red-500">●</span>}
                      {!m.critical && <span className="text-slate-300">○</span>}
                      <span className="text-slate-700 flex-1">{m.task}</span>
                      <span className="text-slate-400">{FREQ_LABEL[m.freq]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Store equipment list */}
      <div className="space-y-2">
        {storeEquipment.map((eq, idx) => {
          const catalog = getCatalogItem(eq.catalogId);
          if (!catalog) return null;
          const isExpanded = expandedEquip === `${idx}`;
          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setExpandedEquip(isExpanded ? null : `${idx}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                <span className="text-xl">{catalog.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900">{eq.nickname}</h3>
                  <p className="text-[10px] text-slate-500">
                    {eq.brand} {eq.model && `• ${eq.model}`} • 👤 {eq.assignedTo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                    {catalog.maintenance.length} bakım
                  </span>
                  <span className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="space-y-1.5 mb-3">
                    {catalog.maintenance.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        {m.critical ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                        )}
                        <span className="text-slate-700 flex-1">{m.task}</span>
                        <span className="text-slate-400 text-[10px]">{FREQ_LABEL[m.freq]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => removeEquipment(idx)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* External Services */}
      <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3">🏢 Xarici Firma Xidmətləri</h2>
      <div className="space-y-2">
        {EXTERNAL_SERVICES.map((svc) => (
          <div key={svc.id} className={`bg-white rounded-xl border p-4 ${svc.critical ? "border-amber-200" : "border-slate-200"}`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{svc.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-slate-900">{svc.name}</h3>
                <p className="text-[10px] text-slate-500">{svc.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-600">{FREQ_LABEL[svc.freq]}</span>
                {svc.requiresCertificate && (
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">📄 Sertifika məcburi</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
