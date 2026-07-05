import Link from "next/link";

const MENU_ITEMS = [
  { id: "1", name: "Ət Dönər Lavaş 300qr", category: "Əsas Yeməklər", price: 8.5, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80", active: true, featured: true },
  { id: "2", name: "Toyuq Dönər Çörək 200qr", category: "Əsas Yeməklər", price: 6.0, image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&q=80", active: true, featured: false },
  { id: "3", name: "Shaurma No.1 Ət Lavaş", category: "Əsas Yeməklər", price: 12.0, image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80", active: true, featured: true },
  { id: "4", name: "Mercimək Şorbası", category: "Şorba", price: 3.5, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80", active: true, featured: false },
  { id: "5", name: "Ayran 250ml", category: "İçkilər", price: 1.5, image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80", active: true, featured: false },
  { id: "6", name: "Baklava Porsiyon", category: "Desertlər", price: 4.0, image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&q=80", active: false, featured: false },
];

export default function MenuPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menyu</h1>
          <p className="text-sm text-slate-500 mt-1">
            {MENU_ITEMS.filter((i) => i.active).length} aktiv məhsul
          </p>
        </div>
        <Link
          href="/admin/menu/yeni"
          className="px-4 py-2 bg-[var(--ocaq-red)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          + Yeni Məhsul
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MENU_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${!item.active ? "opacity-50" : ""}`}
          >
            <div className="relative h-36 overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {item.featured && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                  TOPSİYƏ
                </span>
              )}
              {!item.active && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-slate-700 text-white text-[10px] font-bold rounded-full">
                  DEAKTİV
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {item.category}
              </p>
              <h3 className="font-bold text-slate-900 mt-0.5">{item.name}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold text-[var(--ocaq-red)]">
                  {item.price.toFixed(2)} ₼
                </span>
                <button className="text-xs text-slate-500 hover:text-[var(--ocaq-red)] transition-colors">
                  Redaktə et →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
