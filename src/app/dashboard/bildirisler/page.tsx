"use client";

import { useState } from "react";

interface Notification {
  id: string;
  type: "urgent" | "info" | "task" | "promo";
  title: string;
  message: string;
  time: string;
  from: string;
  read: boolean;
  location?: string;
}

const NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "urgent",
    title: "Fritöz 2 nasazdır",
    message: "Neftçilər filialında fritöz 2 temperatur saxlamır. Texnik çağırılıb, gözlənilir.",
    time: "15 dəq əvvəl",
    from: "Əli Həsənov",
    read: false,
    location: "Neftçilər",
  },
  {
    id: "2",
    type: "task",
    title: "Sabah checklist tamamlanmadı",
    message: "Nizami filialında sabah vardiyası checklist-i 60%-də qalıb. 17 maddə gözləyir.",
    time: "1 saat əvvəl",
    from: "Sistem",
    read: false,
    location: "Nizami",
  },
  {
    id: "3",
    type: "promo",
    title: "Yeni kampaniya başladı",
    message: "Ailə Paketi 20% endirim kampaniyası bu gün aktivləşdi. Bütün filiallara şamil edilir.",
    time: "3 saat əvvəl",
    from: "Admin",
    read: true,
  },
  {
    id: "4",
    type: "info",
    title: "Sabah toplantı — 09:00",
    message: "Həftəlik müdür toplantısı sabah 09:00-da. Mövzu: iyul ayı satış hədəfləri.",
    time: "dünən",
    from: "Doğan Tomris",
    read: true,
  },
  {
    id: "5",
    type: "urgent",
    title: "SİT: 3 məhsulun vaxtı bitir",
    message: "Bülbül filialında krem, toyuq filesi və pendir sabah SİT-ə çatır. Yoxla və ya utilizasiya et.",
    time: "dünən",
    from: "Sistem",
    read: true,
    location: "Bülbül",
  },
];

const TYPE_STYLES: Record<string, { bg: string; icon: string; label: string }> = {
  urgent: { bg: "bg-red-50 border-red-200", icon: "🚨", label: "Təcili" },
  task: { bg: "bg-amber-50 border-amber-200", icon: "📋", label: "Tapşırıq" },
  promo: { bg: "bg-emerald-50 border-emerald-200", icon: "🎁", label: "Promo" },
  info: { bg: "bg-blue-50 border-blue-200", icon: "ℹ️", label: "Məlumat" },
};

export default function BildirislerPage() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [filter, setFilter] = useState<string>("all");

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bildirişlər</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} oxunmamış bildiriş`
              : "Bütün bildirişlər oxunub"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { id: "all", label: "Hamısı" },
          { id: "urgent", label: "🚨 Təcili" },
          { id: "task", label: "📋 Tapşırıq" },
          { id: "promo", label: "🎁 Promo" },
          { id: "info", label: "ℹ️ Məlumat" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.id
                ? "bg-[var(--ocaq-red)] text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((n) => {
          const style = TYPE_STYLES[n.type];
          return (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                n.read
                  ? "bg-white border-slate-200"
                  : `${style.bg} border shadow-sm`
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`text-sm font-semibold ${
                        n.read ? "text-slate-600" : "text-slate-900"
                      }`}
                    >
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--ocaq-red)] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span>{n.time}</span>
                    <span>•</span>
                    <span>{n.from}</span>
                    {n.location && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                          📍 {n.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
