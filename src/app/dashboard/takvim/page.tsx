"use client";

import { useState } from "react";

const DAYS = ["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."];
const SHIFTS = ["Sabah (08-16)", "Axşam (16-00)"];

const STAFF = [
  { id: "1", name: "Əli Həsənov", role: "Aşpaz", avatar: "👨‍🍳" },
  { id: "2", name: "Leyla Məmmədova", role: "Ofisiant", avatar: "👩‍🍳" },
  { id: "3", name: "Orxan Kazımov", role: "Barmen", avatar: "🧑‍🍳" },
  { id: "4", name: "Nigar Əliyeva", role: "Kassir", avatar: "👩‍💼" },
  { id: "5", name: "Tural İsmayılov", role: "Aşpaz", avatar: "👨‍🍳" },
  { id: "6", name: "Aynur Hüseynova", role: "Ofisiant", avatar: "👩‍🍳" },
];

type ScheduleMap = Record<string, string>;

export default function TakvimPage() {
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [week] = useState(() => {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  });

  const key = (staffId: string, dayIdx: number) => `${staffId}-${dayIdx}`;

  const toggleShift = (staffId: string, dayIdx: number) => {
    const k = key(staffId, dayIdx);
    const current = schedule[k];
    const next = !current
      ? SHIFTS[0]
      : current === SHIFTS[0]
        ? SHIFTS[1]
        : undefined;
    setSchedule((prev) => {
      const copy = { ...prev };
      if (next) copy[k] = next;
      else delete copy[k];
      return copy;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vardiya Təqvimi</h1>
          <p className="text-sm text-slate-500 mt-1">
            {week[0].toLocaleDateString("az-AZ", { day: "numeric", month: "long" })} —{" "}
            {week[6].toLocaleDateString("az-AZ", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900 w-48">
                Əməkdaş
              </th>
              {DAYS.map((day, idx) => (
                <th
                  key={day}
                  className={`text-center px-2 py-3 text-xs font-semibold ${
                    idx >= 5 ? "text-[var(--ocaq-red)]" : "text-slate-600"
                  }`}
                >
                  <div>{day}</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                    {week[idx].getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.map((person) => (
              <tr key={person.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{person.avatar}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{person.name}</p>
                      <p className="text-[10px] text-slate-400">{person.role}</p>
                    </div>
                  </div>
                </td>
                {DAYS.map((_, dayIdx) => {
                  const k = key(person.id, dayIdx);
                  const shift = schedule[k];
                  return (
                    <td key={dayIdx} className="text-center px-1 py-2">
                      <button
                        onClick={() => toggleShift(person.id, dayIdx)}
                        className={`w-full py-2 rounded-lg text-[10px] font-medium transition-all ${
                          shift === SHIFTS[0]
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : shift === SHIFTS[1]
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-slate-50 text-slate-300 border border-dashed border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {shift ? (shift === SHIFTS[0] ? "☀️ S" : "🌙 A") : "+"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Sabah (08-16)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200" /> Axşam (16-00)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-50 border border-dashed border-slate-200" /> Boş
        </span>
      </div>
    </div>
  );
}
