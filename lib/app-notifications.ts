import { getD1 } from "@/db";
import { buildPushPayload } from "@block65/webcrypto-web-push";

function safeFailure(error:unknown){return error instanceof Error?error.message.replace(/https?:\/\/\S+/g,'[URL]').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,220):'Unknown';}
class PushDeliveryError extends Error {
 constructor(public code:string,public status:number,public stage:string){super(code);}
}
async function sendPush(endpoint:string,p256dh:string,auth:string,data:Record<string,string>|string,ttl:number){
 let payload;
 try{payload=await buildPushPayload({data,options:{ttl,urgency:'high'}},{endpoint,expirationTime:null,keys:{p256dh,auth}},await pushKeys());}
 catch(e){console.error('browser_push_failure',JSON.stringify({stage:'encrypt',code:'PUSH_PREPARE',name:e instanceof Error?e.name:'Error',detail:safeFailure(e)}));throw new PushDeliveryError('PUSH_PREPARE',500,'encrypt');}
 // Let the runtime calculate content length for the encrypted binary body.
 const headers=new Headers(payload.headers);headers.delete('content-length');
 for(let attempt=0;attempt<2;attempt++){
  try{const response=await fetch(endpoint,{method:'POST',headers,body:payload.body,redirect:'manual',signal:AbortSignal.timeout(10000)});
   // Never forward the encrypted payload or VAPID header to a redirect destination.
   if(response.status>=300&&response.status<400)return response;
   if(attempt===0&&(response.status===408||response.status>=500)){await response.body?.cancel();continue;}
   return response;
  }catch(e){if(attempt===0)continue;const code=e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError')?'PUSH_TIMEOUT':'PUSH_NETWORK';console.error('browser_push_failure',JSON.stringify({stage:'transport',code,name:e instanceof Error?e.name:'Error',detail:safeFailure(e),host:new URL(endpoint).hostname}));throw new PushDeliveryError(code,502,'transport');}
 }
 throw new PushDeliveryError('PUSH_NETWORK',502,'transport');
}
function pushErrorMessage(error:unknown){
 const code=error instanceof PushDeliveryError?error.code:'PUSH_INTERNAL';
 const explanation=code==='PUSH_PREPARE'?'Server gagal menyiapkan pesan terenkripsi.':code==='PUSH_TIMEOUT'?'Server belum mendapat respons dari penyedia notifikasi.':code==='PUSH_NETWORK'?'Sambungan dari server SIBUKTAMU ke penyedia notifikasi gagal.':'Terjadi kesalahan internal saat mengirim notifikasi.';
 return `${explanation} Ini bukan ukuran kualitas internet HP. Tidak perlu memperbarui koneksi perangkat berulang kali. Laporkan kode ${code} kepada pengelola.`;
}
export function validPushEndpoint(value: string) {
  try { const u=new URL(value); return u.protocol==="https:" && !u.username && !u.password && !u.port && !u.hash && (
    u.hostname==="fcm.googleapis.com" || u.hostname==="updates.push.services.mozilla.com" ||
    u.hostname.endsWith(".push.services.mozilla.com") || u.hostname==="web.push.apple.com" ||
    u.hostname.endsWith(".notify.windows.com")); } catch { return false; }
}
export async function pushKeys() {
  const db=getD1();
  let row=await db.prepare("SELECT public_key,private_key FROM admin_push_config WHERE id='default'").first<{public_key:string;private_key:string}>();
  if(!row) {
    const pair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
    const pub=new Uint8Array(await crypto.subtle.exportKey("raw",pair.publicKey));
    const privateJwk=await crypto.subtle.exportKey("jwk",pair.privateKey);
    const publicKey=Buffer.from(pub).toString("base64url");
    await db.prepare("INSERT OR IGNORE INTO admin_push_config(id,public_key,private_key) VALUES('default',?,?)").bind(publicKey,privateJwk.d!).run();
    row=await db.prepare("SELECT public_key,private_key FROM admin_push_config WHERE id='default'").first<{public_key:string;private_key:string}>();
  }
  return {subject:"mailto:disnakertrans@sultengprov.go.id",publicKey:row!.public_key,privateKey:row!.private_key};
}
// Idempotent per visitor, event and administrator; no phone number is required.
export async function queueAppNotifications(visitId:string,eventType:"ARRIVAL"|"COMPLETED") {
  await getD1().prepare(`INSERT OR IGNORE INTO whatsapp_notification_logs
    (id,visit_id,recipient_user_id,event_type,message,status,created_at,updated_at)
    SELECT ? || ':' || ? || ':' || u.id, v.id,u.id,?, ?, 'AVAILABLE',?,?
    FROM users u JOIN roles r ON r.id=u.role_id CROSS JOIN visits v
    WHERE v.id=? AND u.is_active=1 AND r.name IN ('SUPER_ADMIN','ADMIN_BIDANG','FRONT_OFFICE')`)
    .bind(visitId,eventType,eventType,eventType==='ARRIVAL'?'Tamu baru datang':'Layanan tamu selesai',new Date().toISOString(),new Date().toISOString(),visitId).run();
}
export async function dispatchAppNotifications(visitId:string,eventType:"ARRIVAL"|"COMPLETED") {
  // Push delivery is independent of the dashboard notification log.
  try { await queueAppNotifications(visitId,eventType); }
  catch { console.error('app_notification_queue_failed'); }
  const db=getD1();
  const subscriptions=await db.prepare(`SELECT p.endpoint,p.p256dh,p.auth,p.user_id FROM admin_push_subscriptions p
    JOIN users u ON u.id=p.user_id JOIN roles r ON r.id=u.role_id
    JOIN admin_sessions s ON s.id=p.session_id JOIN admin_credentials c ON c.user_id=u.id
    WHERE u.is_active=1 AND c.must_change_password=0 AND s.expires_at>? AND r.name IN ('SUPER_ADMIN','ADMIN_BIDANG')`).bind(new Date().toISOString()).all<{endpoint:string;p256dh:string;auth:string;user_id:string}>();
  if(!subscriptions.results.length)return;
  // Lockscreen content deliberately contains no guest identity or visit purpose.
  const data={title:eventType==='ARRIVAL'?'Tamu baru datang':'Layanan tamu selesai',body:eventType==='ARRIVAL'?'Ada tamu baru menunggu pelayanan. Ketuk untuk melihat bidang dan keperluannya.':'Ketuk untuk melihat rincian kunjungan yang selesai.',tag:visitId+':'+eventType,url:'/admin/kunjungan/'+encodeURIComponent(visitId)};
  for(let i=0;i<subscriptions.results.length;i+=4) await Promise.allSettled(subscriptions.results.slice(i,i+4).map(async p=>{
    if(!validPushEndpoint(p.endpoint))return;
    try {
      const response=await sendPush(p.endpoint,p.p256dh,p.auth,data,3600);
      if(response.status===404||response.status===410)await db.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=?').bind(p.endpoint).run();
      else if(!response.ok)console.error('browser_push_rejected',response.status);
    }catch{console.error('browser_push_unavailable');}
  }));
}

export async function testDevicePush(endpoint:string,userId:string,sessionId:string) {
 const p=await getD1().prepare('SELECT endpoint,p256dh,auth FROM admin_push_subscriptions WHERE endpoint=? AND user_id=? AND session_id=?').bind(endpoint,userId,sessionId).first<{endpoint:string;p256dh:string;auth:string}>();
 if(!p)return {status:404,error:'Perangkat belum terdaftar. Aktifkan kembali notifikasi perangkat.'};
 try {
  const tag='test:'+crypto.randomUUID();
  const response=await sendPush(p.endpoint,p.p256dh,p.auth,{title:'Uji notifikasi SIBUKTAMU',body:'Pesan uji dari server SIBUKTAMU telah sampai ke perangkat ini.',tag},120);
  if(response.status===404||response.status===410){await getD1().prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=?').bind(endpoint).run();return {status:410,error:'Langganan perangkat kedaluwarsa. Nonaktifkan lalu aktifkan kembali notifikasi.'};}
  if(!response.ok){console.error('browser_push_rejected',response.status);return {status:502,error:'Penyedia notifikasi menolak kiriman server (HTTP '+response.status+'). Laporkan kode ini kepada pengelola; memperbarui koneksi HP belum tentu memperbaikinya.'};}
  return {status:200,accepted:true,tag};
 }catch(error){return {status:error instanceof PushDeliveryError?error.status:500,error:pushErrorMessage(error)};}
}
