import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
const sql = neon(process.env.DATABASE_URL);
// name, bölgə müdiri, hədəf(2025 tam ay), 2026 1-7 iyul faktiki (7 günlük)
const DATA = [
  ['Bayıl','İsmayıl',149761,38246],['Hüseyn Cavid','Ceyhun',122387,31065],['Neftçilər','Elnur',117653,29265],
  ['Nərimanov','Taleh',112695,27762],['Duet','Taleh',197858,47649],['5 Mərtəbə','İsmayıl',208237,47597],
  ['Bulvar','İsmayıl',194144,58482],['Binəqədi','Taleh',116515,27911],['Bakıxanov 1','Elnur',89142,22303],
  ['Amay','Taleh',102925,23021],['İnşaatçılar','Ceyhun',113772,26112],['Ayna Sultanova','Taleh',64036,15228],
  ['Bakıxanov 2','Elnur',90333,19966],['Mərdəkan','Ramin',368946,81342],['Əcəmi','Ceyhun',158009,34025],
  ['Gəncə','Ramin',33315,7371],['Həzi Aslanov','Elnur',86973,18872],['Seabreeze','Ramin',334943,79669],
  ['Zığ','Elnur',95695,20867],['Bilgəh','Ramin',194129,41250],['Torgoviy','İsmayıl',293932,60355],
  ['Masazır','Ceyhun',85089,17527],['Space','Ceyhun',208145,41991],['Corner','İsmayıl',194593,37545],
  ['İnqilab','Ramin',83134,16548],['Badamdar','İsmayıl',64909,12370],['Azadlıq','Taleh',41331,7311],
  ['Əhmədli','Elnur',63530,10789],['Sumqayıt','Ceyhun',51219,8445],
];
const MONTH='2026-07-01';
const DAYS=['2026-07-01','2026-07-02','2026-07-03','2026-07-04','2026-07-05','2026-07-06','2026-07-07'];
const MGR={'İsmayıl':'ismayil','Ceyhun':'ceyhun','Elnur':'elnur','Taleh':'taleh','Ramin':'ramin'};
const r2=n=>Math.round(n*100)/100;
const [t]=await sql`select id from tenants where slug='ocaq' limit 1`;
if(!t) throw new Error("tenant yox");
const tid=t.id;
const hash=await bcrypt.hash('Ocaq2026!',12);
const reg={};
for(const [m,u] of Object.entries(MGR)){
  const email=u+'@ocaq.app';
  let [x]=await sql`select id from users where email=${email} limit 1`;
  if(!x)[x]=await sql`insert into users (tenant_id,email,name,password_hash,role,is_active,is_email_verified,email_verified_at) values (${tid},${email},${m},${hash},'region_manager',true,true,now()) returning id`;
  const rn=m+' bölgəsi';
  let [rr]=await sql`select id from regions where tenant_id=${tid} and name=${rn} limit 1`;
  if(!rr)[rr]=await sql`insert into regions (tenant_id,name,manager_id,is_active) values (${tid},${rn},${x.id},true) returning id`;
  else await sql`update regions set manager_id=${x.id} where id=${rr.id}`;
  reg[m]=rr.id;
}
const bid={}; let i=0;
for(const [name,m] of DATA){
  i++; const code='F-'+String(i).padStart(2,'0');
  let [b]=await sql`select id from branches where tenant_id=${tid} and name=${name} limit 1`;
  if(!b)[b]=await sql`insert into branches (tenant_id,region_id,code,name,city,is_active,is_archived) values (${tid},${reg[m]},${code},${name},'Bakı',true,false) returning id`;
  else await sql`update branches set region_id=${reg[m]},code=${code},is_archived=false,is_active=true where id=${b.id}`;
  bid[name]=b.id;
}
const ids=Object.values(bid);
await sql`delete from sales_targets where tenant_id=${tid} and month=${MONTH} and branch_id=any(${ids})`;
await sql`delete from daily_sales where tenant_id=${tid} and sale_date>='2026-07-01' and sale_date<='2026-07-31' and branch_id=any(${ids})`;
let sr=0;
for(const [name,,target,actual] of DATA){
  const b=bid[name];
  await sql`insert into sales_targets (tenant_id,branch_id,month,target_amount) values (${tid},${b},${MONTH},${target})`;
  const per=r2(actual/DAYS.length);
  for(let d=0;d<DAYS.length;d++){
    const amt=d===DAYS.length-1?r2(actual-per*(DAYS.length-1)):per;
    await sql`insert into daily_sales (tenant_id,branch_id,sale_date,amount,day_of_week) values (${tid},${b},${DAYS[d]},${amt},${new Date(DAYS[d]).getDay()})`;
    sr++;
  }
}
console.log('✅ '+DATA.length+' filial | 1-7 iyul faktiki satış: '+sr+' sətir | aylıq hədəf (2025) quruldu');
process.exit(0);
