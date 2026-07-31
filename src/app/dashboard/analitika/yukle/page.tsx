import { redirect } from 'next/navigation'

// analitika/yükle → Satış Paneli (upload + avtomatik yadda saxlama orada). Köhnə link yönləndirilir.
export default function AnalitikaYuklePage() {
  redirect('/dashboard/panel')
}
