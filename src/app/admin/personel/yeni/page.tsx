import { redirect } from 'next/navigation'

export default function LegacyNewStaffPage() {
  redirect('/dashboard/staff')
}
