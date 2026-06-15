import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Xoş gəldiniz, Müdür
      </h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Aktiv Promolar", value: "3", color: "bg-rose-50 text-rose-700" },
          { label: "Menyu Məhsulları", value: "24", color: "bg-amber-50 text-amber-700" },
          { label: "Bugünkü Checklist", value: "78%", color: "bg-emerald-50 text-emerald-700" },
          { label: "Personel Online", value: "5", color: "bg-blue-50 text-blue-700" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color.split(" ")[1]}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">
        Tez keçidlər
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            href: "/dashboard/promosyonlar",
            icon: "🎁",
            title: "Promosyonlar",
            desc: "Aktiv endirimləri göstər, QR paylaş",
          },
          {
            href: "/dashboard/menu",
            icon: "🍽️",
            title: "Menyu",
            desc: "Məhsulları göstər, qiymətləri yoxla",
          },
          {
            href: "/dashboard/vardiya-checklist",
            icon: "✅",
            title: "Vardiya Checklist",
            desc: "MƏK F 08 — Açılış / Kapanış",
          },
          {
            href: "/admin/promosyonlar/yeni",
            icon: "➕",
            title: "Yeni Promo Yarat",
            desc: "Admin: endirim və ya kampaniya əlavə et",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--ocaq-red)] hover:shadow-md transition-all"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-[var(--ocaq-red)] transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
