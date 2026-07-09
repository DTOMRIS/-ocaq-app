import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { branches } from '@/db/schema/branches'
import { regions } from '@/db/schema/regions'
import { staff_profiles } from '@/db/schema/staff'
import { eq, and, inArray } from 'drizzle-orm'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role

  // 1. Staff üçün sadələşdirilmiş görünüş
  if (role === 'staff') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 10px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1a1a1a', margin: '0 0 6px' }}>
            Xoş gəldiniz, {session.user.name ?? 'Əməkdaş'} 👋
          </h2>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            OCAQ Əməkdaş Portalı
          </p>
          <span style={{
            display: 'inline-block', fontSize: '11px', padding: '3px 10px',
            borderRadius: '12px', fontWeight: '600', marginTop: '10px',
            background: '#05966915', color: '#059669',
            border: '1px solid #05966930',
          }}>
            Əməkdaş
          </span>
        </div>

        {/* Action Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <a href="/dashboard/vardiya-checklist" style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #1A1614 0%, #2A2422 100%)',
            color: '#fff', padding: '24px', borderRadius: '16px',
            textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'transform 0.15s ease',
          }}>
            <span style={{ fontSize: '32px', background: 'rgba(242,168,29,0.15)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📋</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px', color: '#F2A81D' }}>KXT Yoxlama Başla</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                Açılış, kapanış və vardiya checklistlərini doldurun.
              </p>
            </div>
          </a>

          <a href="/dashboard/complaints" style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: '#fff', border: '1px solid #e8e8e8',
            color: '#1a1a1a', padding: '24px', borderRadius: '16px',
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            transition: 'transform 0.15s ease',
          }}>
            <span style={{ fontSize: '32px', background: 'rgba(200,16,46,0.1)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚨</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px', color: '#C8102E' }}>Şikayət / İnsident Bildir</h3>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                Kuryer, müştəri şikayətləri və ya daxili insidentləri qeyd edin.
              </p>
            </div>
          </a>
        </div>
      </div>
    )
  }

  // 2. Admin & Manager üçün statistika yükləmə
  let branchCount = 0
  let staffCount = 0
  let regionalBranchIds: string[] = []
  let myBranchesList: any[] = []

  try {
    if (role === 'super_admin') {
      const allBranches = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.is_archived, false))
      branchCount = allBranches.length

      const allStaff = await db
        .select({ id: staff_profiles.id })
        .from(staff_profiles)
        .where(eq(staff_profiles.is_archived, false))
      staffCount = allStaff.length
    } else if (role === 'region_manager') {
      const managedRegions = await db
        .select({ id: regions.id })
        .from(regions)
        .where(eq(regions.manager_id, session.user.id))
      
      if (managedRegions.length > 0) {
        const regionIds = managedRegions.map(r => r.id)
        const regBranches = await db
          .select({ id: branches.id, code: branches.code, name: branches.name, city: branches.city, is_active: branches.is_active })
          .from(branches)
          .where(
            and(
              eq(branches.is_archived, false),
              inArray(branches.region_id, regionIds)
            )
          )
        branchCount = regBranches.length
        myBranchesList = regBranches
        regionalBranchIds = regBranches.map(b => b.id)

        if (regionalBranchIds.length > 0) {
          const regStaff = await db
            .select({ id: staff_profiles.id })
            .from(staff_profiles)
            .where(
              and(
                eq(staff_profiles.is_archived, false),
                inArray(staff_profiles.branch_id, regionalBranchIds)
              )
            )
          staffCount = regStaff.length
        }
      }
    } else if (role === 'branch_manager') {
      const myBranches = await db
        .select({ id: branches.id, code: branches.code, name: branches.name, city: branches.city, is_active: branches.is_active })
        .from(branches)
        .where(
          and(
            eq(branches.is_archived, false),
            eq(branches.manager_id, session.user.id)
          )
        )
      branchCount = myBranches.length
      myBranchesList = myBranches
      const myBranchIds = myBranches.map(b => b.id)

      if (myBranchIds.length > 0) {
        const myStaff = await db
          .select({ id: staff_profiles.id })
          .from(staff_profiles)
          .where(
            and(
              eq(staff_profiles.is_archived, false),
              inArray(staff_profiles.branch_id, myBranchIds)
            )
          )
        staffCount = myStaff.length
      }
    }
  } catch (err) {
    console.error("Dashboard stats query error:", err)
  }

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

  const roleLabel = roleLabels[role] ?? role
  const roleColor = roleColors[role] ?? '#888'

  const ALL_MODULES = [
    { title: 'Personel İdarəetməsi', desc: 'Əməkdaş atama, profil, arşiv',     icon: '👥', href: '/dashboard/staff',  color: '#7C3AED', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager'] },
    { title: 'Filiallar',            desc: 'Filial CRUD, müdür atama',          icon: '🏪', href: '/dashboard/branches', color: '#C8102E', soon: false, roles: ['super_admin', 'region_manager'] },
    { title: 'Şikayət Mərkəzi',       desc: 'Wolt, Bolt və müştəri şikayətləri', icon: '!', href: '/dashboard/complaints', color: '#BE185D', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager', 'staff'] },
    { title: 'İnsan Resursları (HR)', desc: 'İşə qəbul, sınaq müddəti, oryantasiya', icon: '👤', href: '/dashboard/hr', color: '#EA580C', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager'] },
    { title: 'Komanda yoldaşları',   desc: 'Əməkdaş siyahısı və online status', icon: '👥', href: '/dashboard/komanda', color: '#BE185D', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager'] },
    { title: 'Avadanlıq (Ekipman)',  desc: 'Cihaz bakımları və arızalar',      icon: '🔧', href: '/dashboard/ekipman', color: '#3b82f6', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager'] },
    { title: 'Göndərilmiş Checklistlər', desc: 'Keçmiş checklist arxivləri',    icon: '📋', href: '/dashboard/checklists', color: '#C8102E', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager'] },
    { title: 'Bölgələr',             desc: 'Bölgə idarəetməsi, müdür atama',   icon: '◉', href: '/dashboard/regions',    color: '#7C3AED', soon: false, roles: ['super_admin', 'region_manager'] },
    { title: 'Satış Hədəfi',         desc: 'Gündəlik satış, proqnoz, hədəf',   icon: '₼', href: '/dashboard/sales',      color: '#059669', soon: false, roles: ['super_admin', 'region_manager', 'branch_manager'] },
    { title: 'KXT Yoxlama',          desc: 'Dijital checklist, SOP uyğunluğu', icon: '📋', href: '/dashboard/vardiya-checklist', color: '#2563EB', soon: false, roles: ['*'] },
    { title: 'KPI Dashboard',        desc: 'Performans metrikleri',             icon: '📊', href: '#', color: '#059669', soon: true, roles: ['super_admin', 'region_manager'] },
    { title: 'Kampaniya',            desc: 'Promosyon, simülasiya',             icon: '🎯', href: '#', color: '#EA580C', soon: true, roles: ['super_admin', 'region_manager'] },
    { title: 'Hesabatlar',           desc: 'Geriyə dönük raporlar',             icon: '📈', href: '#', color: '#BE185D', soon: true, roles: ['super_admin', 'region_manager'] },
  ]

  const visibleModules = ALL_MODULES.filter(m => m.roles.includes('*') || m.roles.includes(role))

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
          { label: 'Filiallar', value: String(branchCount), icon: '🏪', color: '#C8102E' },
          { label: 'Personel',  value: String(staffCount), icon: '👥', color: '#7C3AED' },
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

      {/* Filiallarım (Yalnız menecerlər üçün) */}
      {(role === 'branch_manager' || role === 'region_manager') && myBranchesList.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>
            Filiallarım ({myBranchesList.length})
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {myBranchesList.map((br) => (
              <div key={br.id} style={{
                background: '#fff', borderRadius: '12px', padding: '20px',
                border: '0.5px solid #e8e8e8',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
                minHeight: '120px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '6px', background: '#1A1614', color: '#F2A81D',
                      fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px'
                    }}>
                      {br.code}
                    </span>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: br.is_active ? '#059669' : '#bbb'
                    }} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
                    {br.name}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px' }}>
                    📍 {br.city}
                  </p>
                </div>
                <a href={`/dashboard/vardiya-checklist?branch_id=${br.id}`} style={{
                  display: 'inline-block', textAlign: 'center' as const,
                  padding: '10px 16px', borderRadius: '8px', background: '#C8102E', color: '#fff',
                  fontSize: '13px', fontWeight: '600', textDecoration: 'none', transition: 'opacity 0.15s'
                }}>
                  📋 Vardiya Checklist Başla
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules */}
      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', margin: '0 0 12px' }}>
        Modullar
      </h3>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
      }}>
        {visibleModules.map((mod) => (
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
