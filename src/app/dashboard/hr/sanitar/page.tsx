"use client";

import { useState } from "react";

const STAFF_SANITAR = [
  { id: "1", name: "Əli Həsənov", role: "Baş Aşpaz", kitabcaNo: "SK-2024-0145", expiry: "2026-08-15", status: "valid" as const },
  { id: "2", name: "Leyla Məmmədova", role: "Ofisiant", kitabcaNo: "SK-2024-0287", expiry: "2026-07-01", status: "warning" as const },
  { id: "3", name: "Orxan Kazımov", role: "Barmen", kitabcaNo: "SK-2025-0012", expiry: "2027-01-10", status: "valid" as const },
  { id: "4", name: "Nigar Əliyeva", role: "Kassir", kitabcaNo: "SK-2023-0456", expiry: "2026-06-10", status: "expired" as const },
  { id: "5", name: "Tural İsmayılov", role: "Aşpaz", kitabcaNo: "SK-2024-0198", expiry: "2026-11-20", status: "valid" as const },
];

export default function SanitarPage() {
  const [staff] = useState(STAFF_SANITAR);

  const expired = staff.filter((s) => s.status === "expired").length;
  const warning = staff.filter((s) => s.status === "warning").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Sanitar Kitabça Takibi</h1>
      <p className="text-sm text-slate-500 mb-4">F14 — AFSA yoxlamasında 5,000-15,000 AZN cərimə riski</p>

      {(expired > 0 || warning > 0) && (
        <div className={`rounded-xl border-2 p-4 mb-4 ${expired > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <p className="text-sm font-bold text-slate-900">
            {expired > 0 && `🔴 ${expired} işçinin sanitar kitabçası BİTİB — qida ilə təmasda işləyə bilməz!`}
            {expired > 0 && warning > 0 && " | "}
            {warning > 0 && `🟡 ${warning} işçinin kitabçası 30 gün içində bitəcək`}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className={`bg-white rounded-xl border p-4 ${
            s.status === "expired" ? "border-red-300 bg-red-50/30" :
            s.status === "warning" ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900">{s.name}</h3>
                <p className="text-[10px] text-slate-500">{s.role} • Kitabça: {s.kitabcaNo}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  s.status === "expired" ? "bg-red-100 text-red-700" :
                  s.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {s.status === "expired" ? "MÜDDƏTİ BİTİB" : s.status === "warning" ? "30 GÜN QALDI" : "ETİBARLI"}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Bitmə: {s.expiry}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mt-4">
        <h3 className="font-bold text-sm text-slate-900 mb-1">💡 Xatırlatma Sistemi</h3>
        <p className="text-xs text-slate-600">
          🟢 90 gün öncə: Yenilənmə xatırlatma SMS/email<br />
          🟡 30 gün öncə: Yazılı xəbərdarlıq + tibbi randevu<br />
          🔴 Müddət bitdi: İşçi qida ilə təmasda olan işdən DƏRHAl kənarlaşdırılır
        </p>
      </div>
    </div>
  );
}
