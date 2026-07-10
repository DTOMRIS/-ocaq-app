import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// PİLOT: yalnız 5 bölgə müdiri. Link əsaslı — şifrə GÖNDƏRMİR.
const sql = neon(process.env.DATABASE_URL);
const BASE = process.env.BASE_URL || 'https://ocaq-app.vercel.app';
const EXPIRY_DAYS = 30;

const REGION_MANAGERS = [
  ['ismayil.i@shaurma.az', 'İsmayıl bölgəsi'],
  ['ceyhun.x@shaurma.az',  'Ceyhun bölgəsi'],
  ['elnur.q@shaurma.az',   'Elnur bölgəsi'],
  ['taleh.a@shaurma.az',   'Taleh bölgəsi'],
  ['ramil.y@shaurma.az',   'Ramin bölgəsi'],
];

const norm = (s) => (s || '').toLowerCase().trim()
  .replace(/ə/g,'a').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c')
  .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ğ/g,'g').replace(/\s+/g,' ');

async function run() {
  const [t] = await sql`select id from tenants where slug='ocaq' limit 1`;
  if (!t) throw new Error('tenant yox');
  const tid = t.id;
  const [admin] = await sql`select id from users where email='admin@ocaq.app' limit 1`;
  const invitedBy = admin ? admin.id : null;

  const regions = await sql`select id, name from regions where tenant_id=${tid}`;
  const rMap = new Map(regions.map(r => [norm(r.name), r.id]));
  const exp = new Date(Date.now() + EXPIRY_DAYS*24*60*60*1000).toISOString();

  console.log('\n=== BÖLGƏ MÜDİRİ PİLOT DƏVƏTLƏRİ ===\n');
  for (const [email, regionName] of REGION_MANAGERS) {
    const [u] = await sql`select id from users where email=${email} limit 1`;
    if (u) { console.log(`${email}  → ARTIQ USER VAR (atlandı)\n`); continue; }

    const region_id = rMap.get(norm(regionName)) || null;
    const [inv] = await sql`select id, token from invitations where email=${email} and accepted_at is null limit 1`;
    let token;
    if (inv) {
      token = inv.token;
      await sql`update invitations set role='region_manager', region_id=${region_id}, branch_id=null, expires_at=${exp} where id=${inv.id}`;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      await sql`insert into invitations (tenant_id, email, role, token, invited_by, region_id, expires_at)
                values (${tid}, ${email}, 'region_manager', ${token}, ${invitedBy}, ${region_id}, ${exp})`;
    }
    const warn = region_id ? '' : `  ⚠ region tapılmadı: ${regionName}`;
    console.log(`${email}  [region_manager] → ${regionName}${warn}`);
    console.log(`  ${BASE}/accept-invite?token=${token}\n`);
  }
  console.log('✅ Bitdi. Bu 5 linki bölgə müdirlərinə göndər — şifrəni özləri qoyacaq.');
  process.exit(0);
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
