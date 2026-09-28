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
      if (![1,2,3,4].includes(payload.rating) || (payload.feedback && (typeof payload.feedback !== "string" || payload.feedback.length > 1000))) return Response.json({error:"Penilaian belum dapat disimpan."},{status:422});
      await db.insert(serviceSurveys).values({id:crypto.randomUUID(),visitId:visit.id,rating:payload.rating,feedback:payload.feedback?.trim() || null}).onConflictDoUpdate({target:serviceSurveys.visitId,set:{rating:payload.rating,feedback:payload.feedback?.trim() || null}});
      return Response.json({success:true});
    }
    return Response.json({error:"Pilih penilaian terlebih dahulu."},{status:422});
  } catch {
    return Response.json({error:"Penilaian belum dapat disimpan. Coba kembali."},{status:500});
  }
}
