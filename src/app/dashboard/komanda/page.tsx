import Link from "next/link";

const TEAM = [
  { id: "1", name: "Əli Həsənov", role: "Baş Aşpaz", location: "Neftçilər", status: "online", phone: "+994501234567", startDate: "2024-03-15", avatar: "👨‍🍳" },
  { id: "2", name: "Leyla Məmmədova", role: "Baş Ofisiant", location: "Neftçilər", status: "online", phone: "+994502345678", startDate: "2024-06-01", avatar: "👩‍🍳" },
  { id: "3", name: "Orxan Kazımov", role: "Barmen", location: "Nizami", status: "offline", phone: "+994503456789", startDate: "2025-01-10", avatar: "🧑‍🍳" },
  { id: "4", name: "Nigar Əliyeva", role: "Kassir", location: "Nizami", status: "online", phone: "+994504567890", startDate: "2025-02-20", avatar: "👩‍💼" },
  { id: "5", name: "Tural İsmayılov", role: "Aşpaz", location: "Bülbül", status: "offline", phone: "+994505678901", startDate: "2024-11-01", avatar: "👨‍🍳" },
  { id: "6", name: "Aynur Hüseynova", role: "Ofisiant", location: "Bülbül", status: "online", phone: "+994506789012", startDate: "2025-04-15", avatar: "👩‍🍳" },
];

export default function KomandaPage() {
  const onlineCount = TEAM.filter((t) => t.status === "online").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Komanda</h1>
          <p className="text-sm text-slate-500 mt-1">
            {TEAM.length} əməkdaş • {onlineCount} online
          </p>
        </div>
        <Link
          href="/admin/personel/yeni"
          className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          + Yeni Əməkdaş
        </Link>
      </div>

      <div className="space-y-2">
        {TEAM.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow"
          >
            <div className="relative">
              <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-2xl">
                {person.avatar}
              </span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  person.status === "online" ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm">
                {person.name}
              </h3>
              <p className="text-xs text-slate-500">{person.role}</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-slate-600">
                📍 {person.location}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Date(person.startDate).toLocaleDateString("az-AZ", { month: "short", year: "numeric" })}-dən
              </p>
            </div>
            <a
              href={`tel:${person.phone}`}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              📞
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
