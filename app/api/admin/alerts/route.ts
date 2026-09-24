import { requireAdminApi,readSessionToken,sessionCookie } from "@/lib/admin-auth";
import { getD1 } from "@/db";
export async function GET(request:Request){
 const auth=await requireAdminApi(["SUPER_ADMIN","ADMIN_BIDANG"]);if('error' in auth)return auth.error;
 const result=await getD1().prepare(`SELECT n.id,n.event_type AS eventType,n.visit_id AS visitId,n.created_at AS createdAt,v.visitor_name AS visitorName
 FROM whatsapp_notification_logs n JOIN visits v ON v.id=n.visit_id
 WHERE n.recipient_user_id=? AND n.archived_at IS NULL ORDER BY n.created_at DESC,n.id DESC LIMIT 50`).bind(auth.identity.id).all();
 const token=readSessionToken(request);
 return Response.json({items:result.results},{headers:{'Cache-Control':'no-store',...(token?{'Set-Cookie':sessionCookie(token)}:{})}});
}
