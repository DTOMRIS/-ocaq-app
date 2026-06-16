"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ana Səhifə", icon: "🏠", section: "main" },
  { href: "/dashboard/promosyonlar", label: "Promosyonlar", icon: "🎁", section: "main" },
  { href: "/dashboard/menu", label: "Menyu", icon: "🍽️", section: "main" },
  { href: "/dashboard/vardiya-checklist", label: "Vardiya Checklist", icon: "✅", section: "ops" },
  { href: "/dashboard/haccp", label: "Qida Təhlükəsizliyi", icon: "🛡️", section: "ops" },
  { href: "/dashboard/tahmin", label: "Satış Təxmini", icon: "📈", section: "ops" },
  { href: "/dashboard/fire", label: "İtki / Fire", icon: "🔥", section: "ops" },
  { href: "/dashboard/kasa", label: "Kasa Raporu", icon: "💰", section: "ops" },
  { href: "/dashboard/takvim", label: "Vardiya Təqvimi", icon: "📅", section: "ops" },
  { href: "/dashboard/ekipman", label: "Ekipman", icon: "🔧", section: "ops" },
  { href: "/dashboard/logbook", label: "Logbook", icon: "📓", section: "ops" },
  { href: "/dashboard/hr", label: "İnsan Resursları", icon: "📋", section: "team" },
  { href: "/dashboard/komanda", label: "Komanda", icon: "👥", section: "team" },
  { href: "/dashboard/bildirisler", label: "Bildirişlər", icon: "🔔", section: "team" },
  { href: "/admin/filiallar", label: "Filiallar", icon: "🏪", section: "admin" },
  { href: "/admin/promosyonlar/yeni", label: "Promo Yarat", icon: "➕", section: "admin" },
  { href: "/admin/menu/yeni", label: "Məhsul Əlavə", icon: "➕", section: "admin" },
  { href: "/admin/ekipman", label: "Ekipman Tanımlama", icon: "🔧", section: "admin" },
  { href: "/admin/personel/yeni", label: "Əməkdaş Əlavə", icon: "➕", section: "admin" },
  { href: "/admin/ayarlar", label: "Rapor Ayarları", icon: "⚙️", section: "admin" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--ocaq-red)] text-white text-sm font-bold">
            O
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            OCAQ
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {(["main", "ops", "team", "admin"] as const).map((section) => {
            const sectionLabels = { main: "", ops: "Operasiya", team: "Komanda", admin: "Admin" };
            const items = NAV_ITEMS.filter((i) => i.section === section);
            return (
              <div key={section}>
                {sectionLabels[section] && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">
                    {sectionLabels[section]}
                  </p>
                )}
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-rose-50 text-[var(--ocaq-red)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--ocaq-navy)] flex items-center justify-center">
              <span className="text-white text-[7px] font-bold">DK</span>
            </div>
            <p className="text-[10px] text-slate-400">DK Agency</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--ocaq-red)] text-white text-sm font-bold flex items-center justify-center">
              O
            </div>
            <span className="font-bold text-slate-900">OCAQ</span>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  active ? "text-[var(--ocaq-red)]" : "text-slate-400"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label.split(":").pop()?.trim()}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
