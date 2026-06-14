import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--ocaq-red)] text-white text-2xl font-bold mb-4">
          O
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">OCAQ</h1>
        <p className="text-slate-500 text-sm">Restoran Operasyon Paneli</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Link
          href="/vardiya-checklist"
          className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[var(--ocaq-red)] transition-all"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-rose-50 text-2xl">
            ✅
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Vardiya Checklist</h2>
            <p className="text-sm text-slate-500">MƏK F 08 — Açılış / Kapanış</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 opacity-50 cursor-not-allowed">
          <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-50 text-2xl">
            💰
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Kasa Raporu</h2>
            <p className="text-sm text-slate-500">Günlük kasa sayımı — Yaxında</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 opacity-50 cursor-not-allowed">
          <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-2xl">
            📊
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Satış Kontrolü</h2>
            <p className="text-sm text-slate-500">Fire hesablama — Yaxında</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 opacity-50 cursor-not-allowed">
          <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-50 text-2xl">
            🔧
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Ekipman Yönetimi</h2>
            <p className="text-sm text-slate-500">Təhvil-təslim, bakım — Yaxında</p>
          </div>
        </div>
      </div>

      <p className="mt-12 text-xs text-slate-400">
        OCAQ v0.1 — DK Agency
      </p>
    </main>
  );
}
