import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const BASE = process.env.BASE_URL || 'https://<SENIN-VERCEL-DOMENIN>';
const [t] = await sql`select id from tenants where slug='ocaq' limit 1`;
const rows = await sql`
  select email, role, token, expires_at, accepted_at, created_at
  from invitations where tenant_id=${t.id}
  order by created_at desc limit 10`;
if (!rows.length) { console.log('Heç bir dəvət tapılmadı.'); process.exit(0); }
console.log('\n=== Son dəvətlər ===\n');
for (const r of rows) {
  const durum = r.accepted_at ? 'QƏBUL EDİLİB' : (new Date(r.expires_at) < new Date() ? 'VAXTI KEÇİB' : 'GÖZLƏYİR');
  console.log(`${r.email}  [${r.role}]  → ${durum}`);
  if (!r.accepted_at) console.log(`  LINK: ${BASE}/accept-invite?token=${r.token}`);
  console.log('');
}
process.exit(0);
