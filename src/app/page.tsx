import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await auth()
  // Rol yoxlanılır, təkcə `session` truthy olması KİFAYƏT DEYİL — ləğv edilmiş
  // sessiyada callback `null` qaytarır, lakin NextAuth boş amma truthy obyekt
  // verə bilir. Əvvəl belə hallarda kök səhifə istifadəçini `/dashboard`-a
  // göndərirdi və oradan boş shell (sidebar-sız, KPI-sız) açılırdı.
  redirect(session?.user?.role ? '/dashboard' : '/login')
}
