import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceSurveys, visitStatusLogs, visits } from "@/db/schema";
import { stableHash } from "@/lib/password";
import { normalizeIndonesianPhone } from "@/lib/visit-rules";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {visitCode?:string;token?:string;surveyToken?:string;phone?:string;action?:string;rating?:number;feedback?:string};
    const code = typeof payload.visitCode === "string" ? payload.visitCode.trim().toUpperCase() : "";
    if (!/^BT-\d{8}-\d{3,}$/.test(code)) return Response.json({error:"Masukkan kode kunjungan yang benar."},{status:422});
    const db = getDb();
    const [visit] = await db.select().from(visits).where(eq(visits.visitCode,code)).limit(1);
    const token = typeof payload.token === "string" && /^[a-f0-9]{64}$/.test(payload.token) ? payload.token : "";
    const phone = typeof payload.phone === "string" ? normalizeIndonesianPhone(payload.phone) : "";
    const surveyAuthorized = visit && visit.checkOutAt && payload.rating !== undefined && typeof payload.surveyToken === "string" && /^[a-f0-9]{64}$/.test(payload.surveyToken) && visit.checkoutTokenHash && payload.surveyToken === await stableHash("survey:" + visit.checkoutTokenHash);
    const authorized = surveyAuthorized || visit && ((token && visit.checkoutTokenHash === await stableHash(token)) || (phone.length >= 10 && phone === visit.phone));
    if (!authorized) return Response.json({error:"Gunakan tautan kunjungan pribadi atau masukkan kode dan nomor HP yang didaftarkan."},{status:403});
    if (payload.action === "STATUS" && !surveyAuthorized) return Response.json({visitCode:code,status:visit.status,checkOutAt:visit.checkOutAt,durationMinutes:visit.durationMinutes});
    if (visit.status === "BATAL") return Response.json({error:"Kunjungan telah dibatalkan. Hubungi petugas."},{status:409});
    if (payload.rating !== undefined) {
      if (!visit.checkOutAt || ![1,2,3,4].includes(payload.rating) || (payload.feedback && (typeof payload.feedback !== "string" || payload.feedback.length > 1000))) return Response.json({error:"Penilaian belum dapat disimpan."},{status:422});
      await db.insert(serviceSurveys).values({id:crypto.randomUUID(),visitId:visit.id,rating:payload.rating,feedback:payload.feedback?.trim() || null}).onConflictDoUpdate({target:serviceSurveys.visitId,set:{rating:payload.rating,feedback:payload.feedback?.trim() || null}});
      return Response.json({success:true});
    }
    if (visit.checkOutAt) return Response.json({success:true,alreadyCompleted:true,durationMinutes:visit.durationMinutes,visitCode:code});
    const now = new Date().toISOString();
    const durationMinutes = Math.max(0,Math.round((Date.now()-new Date(visit.checkInAt).getTime())/60000));
    const updated = await db.update(visits).set({checkOutAt:now,durationMinutes,status:"SELESAI",updatedAt:now}).where(and(eq(visits.id,visit.id),isNull(visits.checkOutAt),ne(visits.status,"BATAL"))).returning({id:visits.id});
    if (!updated.length) return Response.json({error:"Status baru saja berubah. Muat ulang halaman."},{status:409});
    await db.insert(visitStatusLogs).values({id:crypto.randomUUID(),visitId:visit.id,fromStatus:visit.status,toStatus:"SELESAI",notes:"Check-out mandiri terverifikasi"});
    return Response.json({success:true,visitCode:code,durationMinutes});
  } catch {
    return Response.json({error:"Kunjungan belum dapat diselesaikan. Coba kembali."},{status:500});
  }
}
