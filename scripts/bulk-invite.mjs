import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL);
const BASE = process.env.BASE_URL || 'https://ocaq-app.vercel.app';
const EXPIRY_DAYS = 30;

// [email, role, hədəf(branch/region adı və ya null)]
const PEOPLE = [
  // ─── Bölgə müdirləri → region_manager (region adı) ───
  ['ismayil.i@shaurma.az', 'region_manager', 'İsmayıl bölgəsi'],
  ['ceyhun.x@shaurma.az',  'region_manager', 'Ceyhun bölgəsi'],
  ['elnur.q@shaurma.az',   'region_manager', 'Elnur bölgəsi'],
  ['taleh.a@shaurma.az',   'region_manager', 'Taleh bölgəsi'],
  ['ramil.y@shaurma.az',   'region_manager', 'Ramin bölgəsi'],
  // ─── Filial müdirləri → branch_manager (filial adı) ───
  ['bulvar@shaurma.az',        'branch_manager', 'Bulvar'],
  ['bayil@shaurma.az',         'branch_manager', 'Bayıl'],
  ['h.cavid@shaurma.az',       'branch_manager', 'Hüseyn Cavid'],
  ['bakixanov@shaurma.az',     'branch_manager', 'Bakıxanov 1'],
  ['bakixanov2@shaurma.az',    'branch_manager', 'Bakıxanov 2'],
  ['neftchilar@shaurma.az',    'branch_manager', 'Neftçilər'],
  ['narimanov@shaurma.az',     'branch_manager', 'Nərimanov'],
  ['duet@shaurma.az',          'branch_manager', 'Duet'],
  ['binaqadi@shaurma.az',      'branch_manager', 'Binəqədi'],
  ['seabreeze@shaurma.az',     'branch_manager', 'Seabreeze'],
  ['ayna.s@shaurma.az',        'branch_manager', 'Ayna Sultanova'],
  ['inshaatchilar@shaurma.az', 'branch_manager', 'İnşaatçılar'],
  ['5martaba@shaurma.az',      'branch_manager', '5 Mərtəbə'],
  ['amay@shaurma.az',          'branch_manager', 'Amay'],
  ['ganca@shaurma.az',         'branch_manager', 'Gəncə'],
  ['mardakan@shaurma.az',      'branch_manager', 'Mərdəkan'],
  ['zig@shaurma.az',           'branch_manager', 'Zığ'],
  ['h.aslanov@shaurma.az',     'branch_manager', 'Həzi Aslanov'],
  ['m.acami@shaurma.az',       'branch_manager', 'Əcəmi'],
  ['bilgah@shaurma.az',        'branch_manager', 'Bilgəh'],
  ['masazir@shaurma.az',       'branch_manager', 'Masazır'],
  ['tarqovaya@shaurma.az',     'branch_manager', 'Torgoviy'],
  ['space@shaurma.az',         'branch_manager', 'Space'],
  ['inqilab@shaurma.az',       'branch_manager', 'İnqilab'],
  ['corner@shaurma.az',        'branch_manager', 'Corner'],
  ['badamdar@shaurma.az',      'branch_manager', 'Badamdar'],
  ['azadliq@shaurma.az',       'branch_manager', 'Azadlıq'],
  ['ahmadli@shaurma.az',       'branch_manager', 'Əhmədli'],
  ['sumqayit@shaurma.az',      'branch_manager', 'Sumqayıt'],
  // ─── Rəhbərlik / IT → super_admin ───
  ['sanan.n@shaurma.az', 'super_admin', null], // Baş direktor
  ['tural.a@shaurma.az', 'super_admin', null], // IT Administrator
  // ─── Ofis / HQ → staff (sonra dəyişilə bilər) ───
  ['camera@shaurma.az', 'staff', null], ['khayal.a@shaurma.az', 'staff', null],
  ['hikmat.m@shaurma.az', 'staff', null], ['rashad.a@shaurma.az', 'staff', null],
  ['fariz.a@shaurma.az', 'staff', null], ['n.babayeva@shaurma.az', 'staff', null],
  ['hazi.b@shaurma.az', 'staff', null], ['chinara.j@shaurma.az', 'staff', null],
  ['ceyhun.t@shaurma.az', 'staff', null], ['mehdi.e@shaurma.az', 'staff', null],
  ['shamshir.g@shaurma.az', 'staff', null], ['ilkin.m@shaurma.az', 'staff', null],
  ['samil.j@shaurma.az', 'staff', null], ['kamal.a@shaurma.az', 'staff', null],
  ['office@shaurma.az', 'staff', null], ['i.karimli@shaurma.az', 'staff', null],
  ['tamerlan.m@shaurma.az', 'staff', null], ['mirali.m@shaurma.az', 'staff', null],
  ['xatira.n@shaurma.az', 'staff', null], ['gunel.k@shaurma.az', 'staff', null],
  ['ogtay.a@shaurma.az', 'staff', null], ['kanan.q@shaurma.az', 'staff', null],
  ['ramik.o@shaurma.az', 'staff', null], ['cv@shaurma.az', 'staff', null],
  ['azer.s@shaurma.az', 'staff', null], ['elchin.v@shaurma.az', 'staff', null],
  ['info@shaurma.az', 'staff', null],
];

const norm = (s) => (s || '').toLowerCase().trim()
  .replace(/ə/g,'a').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c')
  .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ğ/g,'g').replace(/\s+/g,' ');

async function run() {
  const [t] = await sql`select id from tenants where slug='ocaq' limit 1`;
  if (!t) throw new Error("tenant yox");
  const tid = t.id;

  const [admin] = await sql`select id from users where email='admin@ocaq.app' limit 1`;
  const invitedBy = admin ? admin.id : null;

  const branches = await sql`select id, name from branches where tenant_id=${tid} and is_archived=false`;
  const regions  = await sql`select id, name from regions where tenant_id=${tid}`;
  const bMap = new Map(branches.map(b => [norm(b.name), b.id]));
  const rMap = new Map(regions.map(r => [norm(r.name), r.id]));

  const exp = new Date(Date.now() + EXPIRY_DAYS*24*60*60*1000).toISOString();
  const out = [];

  for (const [email, role, target] of PEOPLE) {
    // artıq qeydiyyatlı user varsa atla
    const [u] = await sql`select id from users where email=${email} limit 1`;
    if (u) { out.push({ email, role, status: 'ARTIQ USER VAR', link: '' }); continue; }

    let region_id = null, branch_id = null, matched = 'ok';
    if (role === 'region_manager') {
      region_id = rMap.get(norm(target)) || null;
      if (!region_id) matched = '⚠ region tapılmadı: '+target;
    } else if (role === 'branch_manager') {
      branch_id = bMap.get(norm(target)) || null;
      if (!branch_id) matched = '⚠ filial tapılmadı: '+target;
    }

    // gözləyən dəvət varsa yenilə, yoxdursa yarat
    const [inv] = await sql`select id, token from invitations where email=${email} and accepted_at is null limit 1`;
    let token;
    if (inv) {
      token = inv.token;
      await sql`update invitations set role=${role}, region_id=${region_id}, branch_id=${branch_id}, expires_at=${exp} where id=${inv.id}`;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      await sql`insert into invitations (tenant_id, email, role, token, invited_by, region_id, branch_id, expires_at)
                values (${tid}, ${email}, ${role}, ${token}, ${invitedBy}, ${region_id}, ${branch_id}, ${exp})`;
    }
    out.push({ email, role, status: matched, link: `${BASE}/accept-invite?token=${token}` });
  }

  console.log('\n=== DƏVƏT LİNKLƏRİ ('+out.length+') — 30 gün etibarlı ===\n');
  for (const o of out) {
    console.log(`${o.email}\t[${o.role}]\t${o.status}`);
    if (o.link) console.log(`  ${o.link}`);
  }
  const warn = out.filter(o => o.status.startsWith('⚠'));
  if (warn.length) console.log('\n⚠️ '+warn.length+' eşleşmeyen (yukarıda), bölge/filial adını yoxla.');
  console.log('\n✅ Bitdi. Linkləri sahiblərinə göndər (şifrəni özləri qoyacaq).');
  process.exit(0);
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
