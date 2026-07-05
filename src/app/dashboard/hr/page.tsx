import Link from "next/link";

const HR_MODULES = [
  { href: "/admin/personel/yeni", icon: "📝", title: "İşə Qəbul", desc: "Yeni əməkdaş müraciət anketi + sənəd yığma", badge: "F02/F03" },
  { href: "/dashboard/hr/oryentasiya", icon: "🎓", title: "Oryantasiya (3 gün)", desc: "Yeni işçi təlim checklist-i — şirkət, HACCP, avadanlıq", badge: "F08-F09" },
  { href: "/dashboard/hr/sinaq", icon: "📊", title: "Sınaq Müddəti", desc: "3 aylıq dəyərləndirmə (1/2/3 ay) — 10 meyar, 50 bal", badge: "F13" },
  { href: "/dashboard/hr/sanitar", icon: "🏥", title: "Sanitar Kitabça Takibi", desc: "Tibbi müayinə, kitabça müddəti, xatırlatma sistemi", badge: "F14" },
  { href: "/dashboard/hr/mezuniyyet", icon: "🏖️", title: "Məzuniyyət / İcazə", desc: "İllik məzuniyyət, əvəz edən şəxs, qalıq gün", badge: "F07" },
  { href: "/dashboard/haccp", icon: "🛡️", title: "HACCP Təlim Qeydiyyatı", desc: "Food Safety təlim, 10 suallıq test, imza", badge: "F15" },
  { href: "/dashboard/komanda", icon: "👥", title: "Komanda", desc: "Personel siyahısı, online status, əlaqə", badge: "" },
];

export default function HRPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">İnsan Resursları</h1>
      <p className="text-sm text-slate-500 mb-6">KAHI HR Formları — İşə qəbuldan işdən çıxmağa qədər</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HR_MODULES.map((m) => (
          <Link key={m.href} href={m.href}
            className="group flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--ocaq-red)] hover:shadow-md transition-all">
            <span className="text-2xl mt-0.5">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 group-hover:text-[var(--ocaq-red)] transition-colors">{m.title}</h3>
                {m.badge && <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{m.badge}</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* İşə qəbul pipeline */}
      <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3">📋 İşə Qəbul Pipeline</h2>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="space-y-3">
          {[
            { step: 1, label: "Ehtiyac", desc: "Şöbə müdiri tələb bildirir", status: "done" },
            { step: 2, label: "Axtarış", desc: "boss.az, LinkedIn, tövsiyə", status: "done" },
            { step: 3, label: "Müsahibə", desc: "HR + Texniki (cooking test)", status: "active" },
            { step: 4, label: "Tövsiyə", desc: "2 əvvəlki iş yerindən", status: "pending" },
            { step: 5, label: "Sənədlər", desc: "Şəx. vəsiqə, sanitar, foto", status: "pending" },
            { step: 6, label: "Müqavilə", desc: "DOST e-müqavilə + NDA", status: "pending" },
            { step: 7, label: "Oryantasiya", desc: "3 gün + mentor", status: "pending" },
            { step: 8, label: "Sınaq", desc: "3 ay × F13 dəyərləndirmə", status: "pending" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                s.status === "done" ? "bg-emerald-100 text-emerald-700" :
                s.status === "active" ? "bg-[var(--ocaq-red)] text-white" :
                "bg-slate-100 text-slate-400"
              }`}>
                {s.status === "done" ? "✓" : s.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${s.status === "pending" ? "text-slate-400" : "text-slate-900"}`}>{s.label}</p>
                <p className="text-[10px] text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
