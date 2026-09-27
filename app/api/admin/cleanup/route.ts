import {validPeriod} from '@/lib/report-period';
import { env } from 'cloudflare:workers';
import { getD1 } from '@/db';
import { requireAdminApi,writeAudit } from '@/lib/admin-auth';

const officialScope="department_id IN ('dept-p4tk','dept-hiwas','dept-pkt','dept-pembangunan','dept-pengembangan','dept-upt-wasnaker-1','dept-upt-wasnaker-2','dept-sekretariat','dept-penerima-tamu')";
// Explicit admin action only. Never run a reset on deployment or page load.
export async function GET(request?:Request){
 const auth=await requireAdminApi(['SUPER_ADMIN']);if('error' in auth)return auth.error;
 const params=new URL(request?.url||'https://local.test').searchParams;
 const from=params.get('from')||'',to=params.get('to')||'',department=params.get('department')||'';
 if((from||to)&&!validPeriod(from,to))return Response.json({error:'Periode tidak valid.'},{status:422});
 const where=from&&to?' WHERE visit_date >= ? AND visit_date <= ?'+(department?' AND department_id = ?':' AND '+officialScope):'';
 const args=from&&to?[from,to,...(department?[department]:[])]:[];
 const rows=await getD1().prepare('SELECT id FROM visits'+where+' ORDER BY created_at,id LIMIT 500').bind(...args).all<{id:string}>();
 return Response.json({ids:rows.results.map(r=>r.id),limit:500},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const auth=await requireAdminApi(['SUPER_ADMIN']);if('error' in auth)return auth.error;
 let body;try{body=await request.json() as {confirmation?:unknown;ids?:unknown;from?:string;to?:string;department?:string};}catch{return Response.json({error:'Permintaan tidak valid.'},{status:400});}
 if((body?.confirmation!=='HAPUS DATA PERCOBAAN'&&body?.confirmation!=='HAPUS PERIODE')||!Array.isArray(body.ids)||body.ids.length>500||body.ids.some(id=>typeof id!=='string'||id.length>64))return Response.json({error:'Konfirmasi dan daftar kunjungan diperlukan.'},{status:422});
 if(body.confirmation==='HAPUS PERIODE'&&!validPeriod(body.from||'',body.to||''))return Response.json({error:'Periode wajib diisi.'},{status:422});
 const ids=[...new Set(body.ids as string[])];if(!ids.length)return Response.json({deleted:0});
 let deleted=0;
 try{
  for(let i=0;i<ids.length;i+=20){
   const batch=ids.slice(i,i+20),marks=batch.map(()=>'?').join(',');
   const rows=await getD1().prepare(`SELECT id,signature_path FROM visits WHERE id IN (${marks})`).bind(...batch).all<{id:string;signature_path:string|null}>();
   if(body.confirmation==='HAPUS PERIODE'){
    const allowed=await getD1().prepare(`SELECT id FROM visits WHERE id IN (${marks}) AND visit_date >= ? AND visit_date <= ?${body.department?' AND department_id = ?':' AND '+officialScope}`).bind(...batch,body.from,body.to,...(body.department?[body.department]:[])).all<{id:string}>();
    if(allowed.results.length!==rows.results.length)return Response.json({error:'Daftar tidak sesuai periode. Periksa ulang.'},{status:409});
   }
   // Delete storage first: a storage failure retains database references for retry.
   for(const row of rows.results)if(row.signature_path)await env.BUCKET.delete(row.signature_path);
   const audit=getD1().prepare(`DELETE FROM audit_logs WHERE (entity='visits' AND entity_id IN (${marks})) OR (entity='whatsapp_notification_logs' AND entity_id IN (SELECT id FROM whatsapp_notification_logs WHERE visit_id IN (${marks}))) OR (entity='visit_transfers' AND entity_id IN (SELECT id FROM visit_transfers WHERE visit_id IN (${marks})))`).bind(...batch,...batch,...batch);
   const statements=['service_surveys','whatsapp_notification_logs','visit_transfers','visit_status_logs'].map(table=>getD1().prepare(`DELETE FROM ${table} WHERE visit_id IN (${marks})`).bind(...batch));
   statements.unshift(audit);
   statements.push(getD1().prepare(`DELETE FROM audit_logs WHERE entity_id IN (${marks}) AND entity IN ('visits','visit_transfers','visit_status_logs','service_surveys','whatsapp_notification_logs')`).bind(...batch));
   statements.push(getD1().prepare(`DELETE FROM visits WHERE id IN (${marks})`).bind(...batch));
   await getD1().batch(statements);deleted+=rows.results.length;
  }
  await writeAudit({userId:auth.identity.id,action:body.confirmation==='HAPUS PERIODE'?'PURGE_PERIOD_VISITS':'PURGE_TEST_VISITS',entity:'maintenance',newValue:{deleted,from:body.from,to:body.to,department:body.department},ipAddress:request.headers.get('cf-connecting-ip')});
  return Response.json({deleted});
 }catch{return Response.json({error:`Pembersihan belum selesai. ${deleted} kunjungan telah dihapus. Muat daftar kembali dan ulangi untuk sisanya.`},{status:503});}
}
