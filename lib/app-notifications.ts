import { getD1 } from "@/db";
import { buildPushPayload } from "@block65/webcrypto-web-push";

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
  await queueAppNotifications(visitId,eventType);
  const db=getD1();
  const subscriptions=await db.prepare(`SELECT p.endpoint,p.p256dh,p.auth,p.user_id FROM admin_push_subscriptions p
    JOIN users u ON u.id=p.user_id JOIN roles r ON r.id=u.role_id
    JOIN admin_sessions s ON s.id=p.session_id JOIN admin_credentials c ON c.user_id=u.id
    WHERE u.is_active=1 AND c.must_change_password=0 AND s.expires_at>? AND r.name IN ('SUPER_ADMIN','ADMIN_BIDANG')`).bind(new Date().toISOString()).all<{endpoint:string;p256dh:string;auth:string;user_id:string}>();
  if(!subscriptions.results.length)return;
  const keys=await pushKeys();
  // Lockscreen content deliberately contains no guest identity or visit purpose.
  const data={title:eventType==='ARRIVAL'?'Tamu baru datang':'Layanan tamu selesai',body:'Buka SIBUKTAMU untuk melihat rincian kunjungan.',tag:visitId+':'+eventType,url:'/admin/notifikasi'};
  for(let i=0;i<subscriptions.results.length;i+=4) await Promise.allSettled(subscriptions.results.slice(i,i+4).map(async p=>{
    if(!validPushEndpoint(p.endpoint))return;
    try {
      const payload=await buildPushPayload({data:JSON.stringify(data),options:{ttl:3600}}, {endpoint:p.endpoint,expirationTime:null,keys:{p256dh:p.p256dh,auth:p.auth}},keys);
      const response=await fetch(p.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(8000)});
      if(response.status===404||response.status===410)await db.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=?').bind(p.endpoint).run();
      else if(!response.ok)console.error('browser_push_rejected',response.status);
    }catch{console.error('browser_push_unavailable');}
  }));
}
