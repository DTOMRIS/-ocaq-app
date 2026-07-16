import Link from 'next/link'

const ACTIVE_MODULES = [
  { href: '/dashboard/staff', icon: '👥', title: 'Personel idarəetməsi', desc: 'Mövcud əməkdaşları filial, vəzifə və status üzrə idarə et.' },
]

const PLANNED_MODULES = [
  { href: '/dashboard/hr/mezuniyyet', icon: '🏖️', title: 'Məzuniyyət və icazə', desc: 'Sorğu, təsdiq, filial əhatəsi və qalıq gün hesabı.' },
  { href: '/dashboard/hr/sanitar', icon: '🏥', title: 'Sanitar sənəd izləmə', desc: 'Real personel profilindən sənəd nömrəsi, tarix və xatırlatma.' },
  { href: '/dashboard/hr/oryentasiya', icon: '🎓', title: 'Oryentasiya', desc: 'Real əməkdaş, mentor, tapşırıq və tamamlama qeydi.' },
  { href: '/dashboard/hr/sinaq', icon: '📊', title: 'Sınaq müddəti', desc: 'Dövri dəyərləndirmə, inkişaf planı və rəhbər təsdiqi.' },
]

export default function HRPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">İnsan və komanda idarəetməsi</h1>
      <p className="text-sm text-slate-500 mb-6">OCAQ əməkdaş hesabları və HR proseslərinin real vəziyyəti</p>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Aktiv</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACTIVE_MODULES.map((module) => (
          <Link key={module.href} href={module.href} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--ocaq-red)] hover:shadow-sm">
            <span className="text-2xl">{module.icon}</span>
            <div><h3 className="font-semibold text-slate-900">{module.title}</h3><p className="mt-1 text-xs text-slate-500">{module.desc}</p></div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Planlaşdırılır</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANNED_MODULES.map((module) => (
          <Link key={module.href} href={module.href} className="flex items-start gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="text-2xl grayscale">{module.icon}</span>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-700">{module.title}</h3><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Hazır deyil</span></div><p className="mt-1 text-xs text-slate-500">{module.desc}</p></div>
          </Link>
        ))}
      </div>
    </div>
  )
}
