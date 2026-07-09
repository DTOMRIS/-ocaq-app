"use client";

import { useState, useEffect } from "react";

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

export default function SettingsPage() {
  const [routes, setRoutes] = useState<Record<string, RouteConfig>>({
    checklist: { recipient: "Filial Müdürü", channel: "sistem" },
    kasa: { recipient: "Mühasibat", channel: "email" },
    ekipman: { recipient: "Texnik Şöbə", channel: "whatsapp" },
    logbook: { recipient: "Baş Menecer (GM)", channel: "sistem" },
    ikram: { recipient: "Mühasibat + GM", channel: "email" },
    bakim: { recipient: "Texnik Şöbə", channel: "sistem" },
  });

  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "audit"
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load from localStorage on client side
  useEffect(() => {
    const savedRoutes = localStorage.getItem("ocaq_route_settings");
    if (savedRoutes) {
      try {
        setRoutes(JSON.parse(savedRoutes));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    // Fetch user session to determine role
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role) {
          setRole(data.user.role);
        }
      })
      .catch((err) => console.error("Session fetch error:", err));
  }, []);

  // Fetch audit logs when tab is clicked
  useEffect(() => {
    if (activeTab === "audit") {
      setLogsLoading(true);
      fetch("/api/audit-logs")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAuditLogs(data);
          }
        })
        .catch((err) => console.error("Error fetching audit logs:", err))
        .finally(() => setLogsLoading(false));
    }
  }, [activeTab]);

  const updateRoute = (reportId: string, field: keyof RouteConfig, value: string) => {
    setRoutes((prev) => ({
      ...prev,
      [reportId]: { ...prev[reportId], [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("ocaq_route_settings", JSON.stringify(routes));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl">
      {/* Tab Switcher */}
      {role === "super_admin" && (
        <div className="flex border-b border-slate-200 mb-6 gap-6">
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "border-[var(--ocaq-red)] text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            ⚙ Parametrlər
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "audit"
                ? "border-[var(--ocaq-red)] text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            🕵️‍♂️ Audit Girişləri
          </button>
        </div>
      )}

      {activeTab === "settings" ? (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Rapor Yönləndirmə Ayarları</h1>
          <p className="text-sm text-slate-500 mb-6">
            Hər &quot;Göndər&quot; butonu raporları hara göndərəcəyini burada təyin edin
          </p>

          <div className="space-y-3">
            {REPORT_TYPES.map((report) => {
              const config = routes[report.id] || { recipient: "", channel: "sistem" };
              return (
                <div key={report.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
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
            className={`w-full mt-6 py-3.5 font-bold rounded-xl text-sm transition-all cursor-pointer ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-[var(--ocaq-red)] text-white hover:opacity-90"
            }`}
          >
            {saved ? "✓ Saxlanıldı!" : "Ayarları Saxla"}
          </button>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sistem Audit Jurnalı</h1>
          <p className="text-sm text-slate-500 mb-6">
            Son 100 sistem və əməliyyat dəyişiklikləri loqu
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {logsLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">Yüklənir...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Heç bir loq tapılmadı.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                      <th className="p-4">Tarix</th>
                      <th className="p-4">Əməl</th>
                      <th className="p-4">Modul</th>
                      <th className="p-4">Detallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("az-AZ")}
                        </td>
                        <td className="p-4 font-semibold text-slate-900 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="p-4 text-slate-600 whitespace-nowrap">
                          {log.entity}
                        </td>
                        <td className="p-4 text-slate-500 text-xs max-w-xs truncate" title={log.metadata}>
                          {log.metadata}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
