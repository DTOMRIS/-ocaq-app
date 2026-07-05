"use client";

import { useState } from "react";

type LogCategory = "general" | "incident" | "maintenance" | "customer" | "staff";

interface LogEntry {
  id: string;
  category: LogCategory;
  message: string;
  author: string;
  shift: string;
  timestamp: string;
  location: string;
  important: boolean;
}

const CATEGORIES: { id: LogCategory; label: string; icon: string }[] = [
  { id: "general", label: "Ümumi", icon: "📝" },
  { id: "incident", label: "Hadisə", icon: "⚠️" },
  { id: "maintenance", label: "Bakım", icon: "🔧" },
  { id: "customer", label: "Müştəri", icon: "👥" },
  { id: "staff", label: "Personal", icon: "👔" },
];

const INITIAL_LOGS: LogEntry[] = [
  { id: "1", category: "incident", message: "Müştəri 12-ci masada yemək temperaturu barədə şikayət etdi. Dərhal yeni porsiya hazırlandı, müştəri razı qaldı. Mətbəxə xəbərdarlıq edildi.", author: "Leyla M.", shift: "Sabah", timestamp: "14 İyun, 14:30", location: "Neftçilər", important: true },
  { id: "2", category: "maintenance", message: "Fritöz 2 yağ dəyişdirildi. Növbəti dəyişmə: 21 İyun. Yağ markası: Kristal 20L.", author: "Əli H.", shift: "Sabah", timestamp: "14 İyun, 11:00", location: "Neftçilər", important: false },
  { id: "3", category: "staff", message: "Orxan K. xəstəlik səbəbindən gəlmədi. Tural İ. əvəzinə çağırıldı, 12:00-da gəldi. Sabah Orxanın vəziyyəti yoxlanacaq.", author: "Müdür Əhməd", shift: "Sabah", timestamp: "14 İyun, 09:15", location: "Nizami", important: true },
  { id: "4", category: "general", message: "Axşam vardiyasına devriyyə: kassa sayımı uyğundur, walk-in soyuducu 3°C, sabah checklist 92% tamamlandı. Fritöz 2 üçün texnik gözlənilir.", author: "Müdür Əhməd", shift: "Sabah → Axşam devri", timestamp: "14 İyun, 16:00", location: "Neftçilər", important: true },
  { id: "5", category: "customer", message: "Nizami filialına 20 nəfərlik qrup rezervasiyası gəldi (Cümə 19:00). Xüsusi menyu hazırlanacaq. Əlaqə: +994 50 111 22 33 — Fərid bəy.", author: "Leyla M.", shift: "Axşam", timestamp: "13 İyun, 20:00", location: "Nizami", important: false },
];

export default function LogbookPage() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [newMsg, setNewMsg] = useState("");
  const [newCat, setNewCat] = useState<LogCategory>("general");
  const [important, setImportant] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const addLog = () => {
    if (!newMsg.trim()) return;
    const entry: LogEntry = {
      id: String(Date.now()),
      category: newCat,
      message: newMsg,
      author: "Cari müdür",
      shift: new Date().getHours() < 16 ? "Sabah" : "Axşam",
      timestamp: new Date().toLocaleDateString("az-AZ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
      location: "Neftçilər",
      important,
    };
    setLogs((prev) => [entry, ...prev]);
    setNewMsg("");
    setImportant(false);
  };

  const filtered = filterCat === "all" ? logs : logs.filter((l) => l.category === filterCat);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Manager Logbook</h1>
      <p className="text-sm text-slate-500 mb-6">Vardiya notları, hadisələr, devriyyə qeydləri</p>

      {/* New entry */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex gap-2 mb-3">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setNewCat(c.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                newCat === c.id ? "bg-[var(--ocaq-red)] text-white" : "bg-slate-100 text-slate-600"
              }`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <textarea value={newMsg} onChange={(e) => setNewMsg(e.target.value)} rows={3}
          placeholder="Vardiya qeydinizi yazın... (hadisə, devriyyə, müştəri əlaqəsi, bakım)"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 resize-none" />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={important} onChange={() => setImportant(!important)}
              className="w-4 h-4 rounded accent-[var(--ocaq-red)]" />
            <span className="text-xs font-medium text-slate-700">⭐ Vacib (növbəti vardiya mütləq oxumalı)</span>
          </label>
          <button onClick={addLog} disabled={!newMsg.trim()}
            className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity">
            Göndər
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filterCat === "all" ? "bg-[var(--ocaq-red)] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
          Hamısı
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setFilterCat(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filterCat === c.id ? "bg-[var(--ocaq-red)] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="space-y-2">
        {filtered.map((log) => {
          const cat = CATEGORIES.find((c) => c.id === log.category);
          return (
            <div key={log.id} className={`bg-white rounded-xl border p-4 ${log.important ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{cat?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {log.important && <span className="text-amber-500 text-xs">⭐</span>}
                    <span className="text-xs font-semibold text-slate-700">{log.author}</span>
                    <span className="text-[10px] text-slate-400">• {log.shift}</span>
                    <span className="text-[10px] text-slate-400">• 📍{log.location}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">{log.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{log.timestamp}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
