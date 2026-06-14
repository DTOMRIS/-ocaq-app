"use client";

import { useState } from "react";
import Link from "next/link";

type TicketStatus = "open" | "in_progress" | "resolved";
type TicketPriority = "low" | "medium" | "high";

interface Ticket {
  id: string;
  equipment: string;
  issue: string;
  priority: TicketPriority;
  status: TicketStatus;
  location: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
}

const EQUIPMENT_LIST = [
  "Fritöz 1", "Fritöz 2", "Dönər Ocağı 1", "Dönər Ocağı 2",
  "Toster", "Soyuducu (Walk-in)", "Vitrin Soyuducu", "İçki Dolabı",
  "Kondisioner", "Hava Pərdəsi", "Kassa POS", "LCD Ekran",
  "Yuyucu Maşın", "Davlumbaz", "Tərəzi",
];

const INITIAL_TICKETS: Ticket[] = [
  { id: "T-001", equipment: "Fritöz 2", issue: "Temperatur saxlamır, 170°C-yə çatmır", priority: "high", status: "open", location: "Neftçilər", reportedBy: "Əli Həsənov", reportedAt: "2026-06-14 15:30" },
  { id: "T-002", equipment: "Kondisioner", issue: "Soyutma gücü zəifdir, salon isti qalır", priority: "medium", status: "in_progress", location: "Nizami", reportedBy: "Leyla Məmmədova", reportedAt: "2026-06-13 10:00", assignedTo: "Texnik Elmar" },
  { id: "T-003", equipment: "Kassa POS", issue: "Barkod oxuyucu işləmir", priority: "medium", status: "resolved", location: "Bülbül", reportedBy: "Nigar Əliyeva", reportedAt: "2026-06-12 09:15", assignedTo: "IT Rəşad" },
  { id: "T-004", equipment: "Davlumbaz", issue: "Filtr dəyişdirmə vaxtıdır (planlı bakım)", priority: "low", status: "open", location: "Neftçilər", reportedBy: "Sistem", reportedAt: "2026-06-14 08:00" },
];

const STATUS_STYLES: Record<TicketStatus, { label: string; bg: string }> = {
  open: { label: "Açıq", bg: "bg-red-100 text-red-700" },
  in_progress: { label: "İcradadır", bg: "bg-amber-100 text-amber-700" },
  resolved: { label: "Həll olunub", bg: "bg-emerald-100 text-emerald-700" },
};

const PRIORITY_STYLES: Record<TicketPriority, { label: string; dot: string }> = {
  high: { label: "Yüksək", dot: "bg-red-500" },
  medium: { label: "Orta", dot: "bg-amber-500" },
  low: { label: "Aşağı", dot: "bg-blue-400" },
};

export default function EkipmanPage() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const handleNewTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newTicket: Ticket = {
      id: `T-${String(tickets.length + 1).padStart(3, "0")}`,
      equipment: fd.get("equipment") as string,
      issue: fd.get("issue") as string,
      priority: fd.get("priority") as TicketPriority,
      status: "open",
      location: fd.get("location") as string,
      reportedBy: "Cari istifadəçi",
      reportedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setTickets((prev) => [newTicket, ...prev]);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ekipman Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Arıza bildirişi, təmir takibi, planlı bakım
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
          {showForm ? "✕ Bağla" : "+ Arıza Bildir"}
        </button>
      </div>

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleNewTicket} className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Ekipman *</label>
              <select name="equipment" required className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
                <option value="">Seçin...</option>
                {EQUIPMENT_LIST.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Prioritet</label>
              <select name="priority" defaultValue="medium" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
                <option value="high">🔴 Yüksək</option>
                <option value="medium">🟡 Orta</option>
                <option value="low">🔵 Aşağı</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Problem Təsviri *</label>
            <textarea name="issue" required rows={2} placeholder="Nə baş verib? Ətraflı yazın..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Filial</label>
              <select name="location" defaultValue="Neftçilər" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30">
                <option>Neftçilər</option><option>Nizami</option><option>Bülbül</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Foto (ixtiyari)</label>
              <label className="flex items-center justify-center h-10 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:border-[var(--ocaq-red)] transition-all text-sm text-slate-500">
                📷 Foto çək
                <input type="file" accept="image/*" capture="environment" className="hidden" />
              </label>
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-[var(--ocaq-red)] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
            Arıza Bildirişi Göndər
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "all", label: `Hamısı (${tickets.length})` },
          { id: "open", label: `Açıq (${tickets.filter((t) => t.status === "open").length})` },
          { id: "in_progress", label: `İcrada (${tickets.filter((t) => t.status === "in_progress").length})` },
          { id: "resolved", label: `Həll (${tickets.filter((t) => t.status === "resolved").length})` },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.id ? "bg-[var(--ocaq-red)] text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_STYLES[t.priority].dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-400">{t.id}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_STYLES[t.status].bg}`}>
                    {STATUS_STYLES[t.status].label}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-slate-900">{t.equipment}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.issue}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                  <span>📍 {t.location}</span>
                  <span>👤 {t.reportedBy}</span>
                  <span>🕐 {t.reportedAt}</span>
                  {t.assignedTo && <span className="text-indigo-600 font-medium">🔧 {t.assignedTo}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
