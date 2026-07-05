import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const roleLabels: Record<string, string> = {
    super_admin:    'Süper Admin',
    region_manager: 'Bölgə Meneceri',
    branch_manager: 'Filial Meneceri',
    staff:          'Əməkdaş',
  }

  const roleColors: Record<string, string> = {
    super_admin:    '#C8102E',
    region_manager: '#7C3AED',
    branch_manager: '#2563EB',
    staff:          '#059669',
  }

  const role = session.user.role
  const roleLabel = roleLabels[role] ?? role
  const roleColor = roleColors[role] ?? '#888'

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
          Xoş gəldiniz, {session.user.name ?? 'İstifadəçi'} 👋
        </h2>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          OCAQ platformasına daxil oldunuz.{' '}
          <span style={{
            display: 'inline-block', fontSize: '11px', padding: '2px 8px',
            borderRadius: '10px', fontWeight: '500',
            background: `${roleColor}12`, color: roleColor,
            border: `1px solid ${roleColor}25`,
          }}>
            {roleLabel}
          </span>
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '32px',
      }}>
        {[
          { label: 'Filiallar', value: '—', icon: '🏪', color: '#C8102E' },
          { label: 'Personel',  value: '—', icon: '👥', color: '#7C3AED' },
          { label: 'KXT Skoru', value: '—', icon: '📋', color: '#2563EB' },
          { label: 'Kampaniya', value: '—', icon: '🎯', color: '#059669' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: '#fff', borderRadius: '10px', padding: '20px',
            border: '0.5px solid #e8e8e8',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: stat.color, opacity: 0.6,
              }} />
            </div>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 2px' }}>
              {stat.value}
            </p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Modules */}
      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>
        Modullar
      </h3>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
      }}>
        {[
          { title: 'Personel İdarəetməsi', desc: 'Əməkdaş atama, profil, arşiv',     icon: '👥', href: '/dashboard/staff',  color: '#7C3AED', soon: false },
          { title: 'Filiallar',            desc: 'Filial CRUD, müdür atama',          icon: '🏪', href: '/dashboard/branches', color: '#C8102E', soon: false },
          { title: 'Şikayət Mərkəzi',       desc: 'Wolt, Bolt və müştəri şikayətləri', icon: '!', href: '/dashboard/complaints', color: '#BE185D', soon: false },
          { title: 'Bölgələr',             desc: 'Bölgə idarəetməsi, müdür atama',   icon: '◉', href: '/dashboard/regions',    color: '#7C3AED', soon: false },
          { title: 'Satış Hədəfi',         desc: 'Gündəlik satış, proqnoz, hədəf',   icon: '₼', href: '/dashboard/sales',      color: '#059669', soon: false },
          { title: 'KXT Yoxlama',          desc: 'Dijital checklist, SOP uyğunluğu', icon: '📋', href: '#', color: '#2563EB', soon: true },
          { title: 'KPI Dashboard',        desc: 'Performans metrikleri',             icon: '📊', href: '#', color: '#059669', soon: true },
          { title: 'Kampaniya',            desc: 'Promosyon, simülasiya',             icon: '🎯', href: '#', color: '#EA580C', soon: true },
          { title: 'Hesabatlar',           desc: 'Geriyə dönük raporlar',             icon: '📈', href: '#', color: '#BE185D', soon: true },
        ].map((mod) => (
          <a key={mod.title} href={mod.soon ? undefined : mod.href} style={{
            display: 'block', background: '#fff', borderRadius: '10px', padding: '20px',
            border: '0.5px solid #e8e8e8', textDecoration: 'none',
            opacity: mod.soon ? 0.5 : 1,
            cursor: mod.soon ? 'default' : 'pointer',
            transition: 'box-shadow .15s',
            position: 'relative' as const,
          }}>
            {mod.soon && (
              <span style={{
                position: 'absolute' as const, top: '12px', right: '12px',
                fontSize: '10px', padding: '2px 8px', borderRadius: '8px',
                background: '#f5f5f5', color: '#888',
              }}>
                Tezliklə
              </span>
            )}
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: `${mod.color}10`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: '12px', fontSize: '20px',
            }}>
              {mod.icon}
            </div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 4px' }}>
              {mod.title}
            </p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              {mod.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
