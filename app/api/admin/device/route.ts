import { requireAdminApi, readSessionToken, sessionCookie, SESSION_DURATION_SECONDS } from "@/lib/admin-auth";
import { getD1 } from "@/db";
import { stableHash } from "@/lib/password";
import { pushKeys,validPushEndpoint } from "@/lib/app-notifications";

export async function GET(request:Request) {
 const auth=await requireAdminApi(["SUPER_ADMIN","ADMIN_BIDANG"]);if('error' in auth)return auth.error;
 const token=readSessionToken(request);if(!token)return new Response(null,{status:401});
 const expires=new Date(Date.now()+SESSION_DURATION_SECONDS*1000).toISOString();
 await getD1().prepare('UPDATE admin_sessions SET expires_at=? WHERE id=?').bind(expires,await stableHash(token)).run();
 const keys=await pushKeys();
 return Response.json({publicKey:keys.publicKey},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(token)}});
}
export async function POST(request:Request) {
 const auth=await requireAdminApi(["SUPER_ADMIN","ADMIN_BIDANG"]);if('error' in auth)return auth.error;
 const token=readSessionToken(request);if(!token)return new Response(null,{status:401});
 let body:{action?:string;subscription?:{endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}}};try{body=await request.json() as typeof body;}catch{return Response.json({error:'Data perangkat tidak valid.'},{status:400});}
 const endpoint=body?.subscription?.endpoint;
 if(typeof endpoint!=='string'||endpoint.length>2048||!validPushEndpoint(endpoint))return Response.json({error:'Alamat notifikasi perangkat tidak didukung.'},{status:422});
 const db=getD1();
 if(body.action==='UNSUBSCRIBE') {await db.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=? AND user_id=?').bind(endpoint,auth.identity.id).run();return Response.json({success:true});}
 const keys=body.subscription?.keys;
 if(!keys || typeof keys.p256dh!=='string'||typeof keys.auth!=='string'|| !/^[A-Za-z0-9_-]+$/.test(keys.p256dh)||!/^[A-Za-z0-9_-]+$/.test(keys.auth)||Buffer.from(keys.p256dh,'base64url').length!==65||Buffer.from(keys.auth,'base64url').length!==16) return Response.json({error:'Kunci perangkat tidak valid.'},{status:422});
 const count=await db.prepare('SELECT COUNT(*) AS n FROM admin_push_subscriptions WHERE user_id=? AND endpoint<>?').bind(auth.identity.id,endpoint).first<{n:number}>();
 if((count?.n??0)>=10)return Response.json({error:'Maksimal 10 perangkat per akun. Nonaktifkan notifikasi di perangkat lama.'},{status:422});
 await db.prepare(`INSERT INTO admin_push_subscriptions(endpoint,user_id,session_id,p256dh,auth,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,session_id=excluded.session_id,p256dh=excluded.p256dh,auth=excluded.auth`).bind(endpoint,auth.identity.id,await stableHash(token),keys.p256dh,keys.auth,new Date().toISOString()).run();
 return Response.json({success:true});
}
