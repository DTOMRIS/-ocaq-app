import Link from "next/link";

const BRANCHES = [
  { id: "1", name: "Neftçilər Filialı", address: "28 May küç., 45", phone: "+994 12 555 01 01", manager: "Əhməd Quliyev", staff: 8, status: "active", openTime: "08:00", closeTime: "00:00" },
  { id: "2", name: "Nizami Filialı", address: "Nizami küç., 120", phone: "+994 12 555 02 02", manager: "Səbinə Əliyeva", staff: 6, status: "active", openTime: "09:00", closeTime: "23:00" },
  { id: "3", name: "Bülbül Filialı", address: "Bülbül pros., 78", phone: "+994 12 555 03 03", manager: "Rəşad Hüseynov", staff: 5, status: "active", openTime: "08:00", closeTime: "01:00" },
];

export default function FiliallarPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Filiallar</h1>
          <p className="text-sm text-slate-500 mt-1">{BRANCHES.length} aktiv filial</p>
        </div>
        <Link href="/admin/filiallar/yeni"
          className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
          + Yeni Filial
        </Link>
      </div>

      <div className="space-y-3">
        {BRANCHES.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{b.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">📍 {b.address}</p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                AKTİV
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Müdür</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">👔 {b.manager}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Personal</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">👥 {b.staff} nəfər</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">İş Saatları</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">🕐 {b.openTime}–{b.closeTime}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Telefon</p>
                <a href={`tel:${b.phone}`} className="text-sm font-medium text-[var(--ocaq-red)] mt-0.5 hover:underline">
                  📞 {b.phone}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
