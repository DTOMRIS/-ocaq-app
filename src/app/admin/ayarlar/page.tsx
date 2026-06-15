"use client";

import { useState } from "react";

const REPORT_TYPES = [
  { id: "checklist", label: "Vardiya Checklist", icon: "✅", desc: "Sabah/axşam checklist nəticələri" },
  { id: "kasa", label: "Kasa Raporu", icon: "💰", desc: "Günlük kasa sayımı + fərq" },
  { id: "ekipman", label: "Ekipman Arıza", icon: "🔧", desc: "Arıza bildirişləri + prioritet" },
  { id: "logbook", label: "Manager Logbook", icon: "📓", desc: "Vardiya notları + devriyyə" },
  { id: "ikram", label: "İkram Qeydləri", icon: "🍽️", desc: "İkram tutarı + səbəb" },
  { id: "bakim", label: "Planlı Bakım", icon: "📅", desc: "Gecikən bakım xəbərdarlıqları" },
];

const CHANNELS = [
  { id: "email", label: "📧 E-poçt" },
  { id: "whatsapp", label: "💬 WhatsApp" },
  { id: "sistem", label: "🔔 Sistem Bildirişi" },
  { id: "sms", label: "📱 SMS" },
];

interface RouteConfig {
  recipient: string;
  channel: string;
}

export default function AyarlarPage() {
  const [routes, setRoutes] = useState<Record<string, RouteConfig>>({
    checklist: { recipient: "Filial Müdürü", channel: "sistem" },
    kasa: { recipient: "Mühasibat", channel: "email" },
    ekipman: { recipient: "Texnik Şöbə", channel: "whatsapp" },
    logbook: { recipient: "Baş Menecer (GM)", channel: "sistem" },
    ikram: { recipient: "Mühasibat + GM", channel: "email" },
    bakim: { recipient: "Texnik Şöbə", channel: "sistem" },
  });

  const [saved, setSaved] = useState(false);

  const updateRoute = (reportId: string, field: keyof RouteConfig, value: string) => {
    setRoutes((prev) => ({
      ...prev,
      [reportId]: { ...prev[reportId], [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Rapor Yönləndirmə Ayarları</h1>
      <p className="text-sm text-slate-500 mb-6">
        Hər &quot;Göndər&quot; butonu raporları hara göndərəcəyini burada təyin edin
      </p>

      <div className="space-y-3">
        {REPORT_TYPES.map((report) => {
          const config = routes[report.id];
          return (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{report.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900">{report.label}</h3>
                  <p className="text-xs text-slate-500">{report.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alıcı</label>
                  <input
                    type="text"
                    value={config.recipient}
                    onChange={(e) => updateRoute(report.id, "recipient", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kanal</label>
                  <select
                    value={config.channel}
                    onChange={(e) => updateRoute(report.id, "channel", e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocaq-red)]/30 focus:border-[var(--ocaq-red)]"
                  >
                    {CHANNELS.map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        className={`w-full mt-6 py-3.5 font-bold rounded-xl text-sm transition-all ${
          saved
            ? "bg-emerald-500 text-white"
            : "bg-[var(--ocaq-red)] text-white hover:opacity-90"
        }`}
      >
        {saved ? "✓ Saxlanıldı!" : "Ayarları Saxla"}
      </button>
    </div>
  );
}
