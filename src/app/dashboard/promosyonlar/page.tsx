import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { promotions } from "@/db/schema/promotions";
import PromoClient, { type Promo } from "./promo-client";

export const metadata = { title: "Promosyonlar — OCAQ" };
export const dynamic = "force-dynamic";

const BADGE_COLORS: Record<string, string> = {
  "AKTİV": "bg-emerald-100 text-emerald-700",
  "YENİ": "bg-amber-100 text-amber-700",
};
const DEFAULT_IMG = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80";

type Row = typeof promotions.$inferSelect;
function discountLabel(p: Row): string {
  if (p.promo_type === "percent" && p.discount_value) return `-${p.discount_value}%`;
  if (p.promo_type === "bogo") return "2 AL 1";
  if (p.promo_type === "fixed" && p.discount_value) return `-${p.discount_value} ₼`;
  if (p.promo_type === "gift") return "🎁";
  return p.discount_value ? `-${p.discount_value}%` : "";
}

export default async function PromosyonlarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let rows: Row[] = [];
  try {
    rows = await db.select().from(promotions)
      .where(and(eq(promotions.tenant_id, session.user.tenant_id), eq(promotions.is_active, true)))
      .orderBy(desc(promotions.created_at));
  } catch { rows = []; }  // cədvəl hələ yoxdursa boş göstər (500 vermə)

  const promos: Promo[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    image: p.image_url || DEFAULT_IMG,
    badge: p.badge || "AKTİV",
    badgeColor: BADGE_COLORS[p.badge || "AKTİV"] ?? "bg-slate-100 text-slate-600",
    validUntil: p.valid_until,
    discountLabel: discountLabel(p),
    code: p.code || "",
  }));

  const canManage = ["super_admin", "region_manager"].includes(session.user.role);
  return <PromoClient promos={promos} canManage={canManage} />;
}
