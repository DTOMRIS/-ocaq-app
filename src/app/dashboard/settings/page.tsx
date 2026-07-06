import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Parametrlər — OCAQ' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  if (session.user.role !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
        Parametrlər
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 32px' }}>
        Sistem konfiqurasiyası
      </p>
      <div style={{
        background: '#fff', borderRadius: '10px', border: '0.5px solid #e8e8e8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '60px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px', background: '#f5f5f5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', margin: '0 auto 16px',
        }}>⚙</div>
        <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 6px' }}>
          Tezliklə aktivləşəcək
        </p>
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
          Tenant ayarları, rol icazələri və modul konfiqurasiyası burada olacaq.
        </p>
      </div>
    </div>
  )
}
