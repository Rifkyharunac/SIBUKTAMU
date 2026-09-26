import { env } from 'cloudflare:workers';
import { getD1 } from '@/db';
import { requireAdminApi,writeAudit } from '@/lib/admin-auth';

// Explicit admin action only. Never run a reset on deployment or page load.
export async function GET(){
 const auth=await requireAdminApi(['SUPER_ADMIN']);if('error' in auth)return auth.error;
 const rows=await getD1().prepare('SELECT id FROM visits ORDER BY created_at,id LIMIT 500').all<{id:string}>();
 return Response.json({ids:rows.results.map(r=>r.id),limit:500},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const auth=await requireAdminApi(['SUPER_ADMIN']);if('error' in auth)return auth.error;
 let body;try{body=await request.json() as {confirmation?:unknown;ids?:unknown};}catch{return Response.json({error:'Permintaan tidak valid.'},{status:400});}
 if(body?.confirmation!=='HAPUS DATA PERCOBAAN'||!Array.isArray(body.ids)||body.ids.length>500||body.ids.some(id=>typeof id!=='string'||id.length>64))return Response.json({error:'Konfirmasi dan daftar kunjungan diperlukan.'},{status:422});
 const ids=[...new Set(body.ids as string[])];if(!ids.length)return Response.json({deleted:0});
 let deleted=0;
 try{
  for(let i=0;i<ids.length;i+=50){
   const batch=ids.slice(i,i+50),marks=batch.map(()=>'?').join(',');
   const rows=await getD1().prepare(`SELECT id,signature_path FROM visits WHERE id IN (${marks})`).bind(...batch).all<{id:string;signature_path:string|null}>();
   // Delete storage first: a storage failure retains database references for retry.
   for(const row of rows.results)if(row.signature_path)await env.BUCKET.delete(row.signature_path);
   const audit=getD1().prepare(`DELETE FROM audit_logs WHERE (entity='visits' AND entity_id IN (${marks})) OR (entity='whatsapp_notification_logs' AND entity_id IN (SELECT id FROM whatsapp_notification_logs WHERE visit_id IN (${marks}))) OR (entity='visit_transfers' AND entity_id IN (SELECT id FROM visit_transfers WHERE visit_id IN (${marks})))`).bind(...batch,...batch,...batch);
   const statements=['service_surveys','whatsapp_notification_logs','visit_transfers','visit_status_logs'].map(table=>getD1().prepare(`DELETE FROM ${table} WHERE visit_id IN (${marks})`).bind(...batch));
   statements.unshift(audit);
   statements.push(getD1().prepare(`DELETE FROM audit_logs WHERE entity_id IN (${marks}) AND entity IN ('visits','visit_transfers','visit_status_logs','service_surveys','whatsapp_notification_logs')`).bind(...batch));
   statements.push(getD1().prepare(`DELETE FROM visits WHERE id IN (${marks})`).bind(...batch));
   await getD1().batch(statements);deleted+=rows.results.length;
  }
  await writeAudit({userId:auth.identity.id,action:'PURGE_TEST_VISITS',entity:'maintenance',newValue:{deleted},ipAddress:request.headers.get('cf-connecting-ip')});
  return Response.json({deleted});
 }catch{return Response.json({error:`Pembersihan belum selesai. ${deleted} kunjungan telah dihapus. Muat daftar kembali dan ulangi untuk sisanya.`},{status:503});}
}
