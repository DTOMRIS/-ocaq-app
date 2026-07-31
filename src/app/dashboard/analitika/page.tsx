import { redirect } from 'next/navigation'

// Analitika → Satış Paneli-nə köçdü (birləşdirildi). Köhnə link işləsin deyə yönləndirmə.
export default function AnalitikaPage() {
  redirect('/dashboard/panel')
}
