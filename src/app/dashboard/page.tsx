import Link from "next/link";

// Gələcəkdə Supabase-dən real data gələcək
const TODAY = {
  sales: { target: 2800, actual: 2145, yesterday: 2530 },
  avgCheck: { value: 18.5, target: 22 },
  covers: { value: 116, target: 140 },
  transactions: { value: 89, peak: "12:30-13:30" },
  labor: { pct: 28, target: 30, alert: false },
  food: { pct: 31, target: 33, alert: false },
  prime: { pct: 59, target: 63, alert: false },
};

const pctOf = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0;

export default function DashboardPage() {
  const salesPct = pctOf(TODAY.sales.actual, TODAY.sales.target);
  const salesDiff = TODAY.sales.actual - TODAY.sales.target;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Xoş gəldiniz, Müdür</h1>
          <p className="text-sm text-slate-500">Bugünkü performans — Neftçilər filialı</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">
            {new Date().toLocaleDateString("az-AZ", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* ═══ SATIŞ HƏDƏFİ — ana kart ═══ */}
      <div className={`rounded-2xl border-2 p-5 mb-4 ${salesPct >= 100 ? "bg-emerald-50 border-emerald-200" : salesPct >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">📊 Günlük Satış</h2>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${salesPct >= 100 ? "bg-emerald-100 text-emerald-700" : salesPct >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {salesPct}%
          </span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-bold text-slate-900">{TODAY.sales.actual.toLocaleString()} ₼</span>
          <span className="text-sm text-slate-500 mb-1">/ {TODAY.sales.target.toLocaleString()} ₼ hədəf</span>
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${salesPct >= 100 ? "bg-emerald-500" : salesPct >= 75 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(salesPct, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Dünən: {TODAY.sales.yesterday.toLocaleString()} ₼</span>
          <span className={salesDiff >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
            {salesDiff >= 0 ? "+" : ""}{salesDiff.toLocaleString()} ₼ fərq
          </span>
        </div>
      </div>

      {/* ═══ KPI KARTLARI ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Average Check */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ortalama Çek</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-900">{TODAY.avgCheck.value}</span>
            <span className="text-sm text-slate-400 mb-0.5">₼</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Hədəf: {TODAY.avgCheck.target} ₼
            <span className={`ml-1 font-bold ${TODAY.avgCheck.value >= TODAY.avgCheck.target ? "text-emerald-600" : "text-amber-600"}`}>
              ({pctOf(TODAY.avgCheck.value, TODAY.avgCheck.target)}%)
            </span>
          </p>
        </div>

        {/* Cover / Müşteri sayısı */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Müştəri Sayı</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-900">{TODAY.covers.value}</span>
            <span className="text-sm text-slate-400 mb-0.5">nəfər</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Hədəf: {TODAY.covers.target}
            <span className={`ml-1 font-bold ${TODAY.covers.value >= TODAY.covers.target ? "text-emerald-600" : "text-amber-600"}`}>
              ({pctOf(TODAY.covers.value, TODAY.covers.target)}%)
            </span>
          </p>
        </div>

        {/* Çek sayısı */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Çek Sayı</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-900">{TODAY.transactions.value}</span>
            <span className="text-sm text-slate-400 mb-0.5">əməliyyat</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Pik: {TODAY.transactions.peak}</p>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Checklist Skor</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-emerald-700">78</span>
            <span className="text-sm text-slate-400 mb-0.5">%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sabah vardiyası</p>
        </div>
      </div>

      {/* ═══ MALİYYƏT GÖSTƏRİCİLƏRİ ═══ */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">💰 Maliyyət Göstəriciləri</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Food Cost", pct: TODAY.food.pct, target: TODAY.food.target, icon: "🥩", good: "aşağı" },
          { label: "Labor Cost", pct: TODAY.labor.pct, target: TODAY.labor.target, icon: "👥", good: "aşağı" },
          { label: "Prime Cost", pct: TODAY.prime.pct, target: TODAY.prime.target, icon: "📊", good: "aşağı" },
        ].map((cost) => {
          const isOk = cost.pct <= cost.target;
          return (
            <div key={cost.label} className={`rounded-xl border p-4 ${isOk ? "bg-white border-slate-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg">{cost.icon}</span>
                <p className="text-xs font-semibold text-slate-700">{cost.label}</p>
              </div>
              <div className="flex items-end gap-1">
                <span className={`text-2xl font-bold ${isOk ? "text-emerald-700" : "text-red-700"}`}>{cost.pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${isOk ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min((cost.pct / cost.target) * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Hədəf: ≤{cost.target}%
                {!isOk && <span className="text-red-600 font-bold ml-1">⚠️ AŞIB</span>}
              </p>
            </div>
          );
        })}
      </div>

      {/* ═══ AYLIQ HƏDƏFLƏR ═══ */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">🎯 Aylıq Hədəflər (İyun 2026)</h2>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="space-y-3">
          {[
            { label: "Aylıq Satış", actual: 42350, target: 84000, unit: "₼" },
            { label: "Aylıq Müştəri", actual: 1840, target: 4200, unit: "nəfər" },
            { label: "Ort. Çek", actual: 18.5, target: 22, unit: "₼" },
            { label: "Google Rey", actual: 4.2, target: 4.5, unit: "★" },
          ].map((g) => {
            const gPct = pctOf(g.actual, g.target);
            return (
              <div key={g.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{g.label}</span>
                  <span className="text-slate-500">
                    <span className="font-bold text-slate-900">{g.actual.toLocaleString()}</span> / {g.target.toLocaleString()} {g.unit}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${gPct >= 80 ? "bg-emerald-500" : gPct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(gPct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ TEZ KEÇİDLƏR ═══ */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Tez Keçidlər</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { href: "/dashboard/vardiya-checklist", icon: "✅", title: "Checklist" },
          { href: "/dashboard/haccp", icon: "🛡️", title: "Food Safety" },
          { href: "/dashboard/kasa", icon: "💰", title: "Kasa" },
          { href: "/dashboard/ekipman", icon: "🔧", title: "Ekipman" },
          { href: "/dashboard/logbook", icon: "📓", title: "Logbook" },
          { href: "/dashboard/takvim", icon: "📅", title: "Təqvim" },
          { href: "/dashboard/hr", icon: "📋", title: "HR" },
          { href: "/dashboard/bildirisler", icon: "🔔", title: "Bildirişlər" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-[var(--ocaq-red)] hover:shadow-sm transition-all text-sm font-medium text-slate-700 hover:text-[var(--ocaq-red)]">
            <span className="text-lg">{item.icon}</span>
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
