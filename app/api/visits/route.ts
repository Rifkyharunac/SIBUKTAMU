import { needsPurpose, visitPurpose } from "@/lib/guest-purpose";
import { env } from "cloudflare:workers";
import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureSeedData } from "@/db/seed";
import {
  departments,
  users,
  roles,
  services,
  submissionAttempts,
  visitStatusLogs,
  visits,
  whatsappNotificationLogs,
} from "@/db/schema";
import { witaParts } from "@/lib/time";

import { isValidIndonesianPhone, normalizeIndonesianPhone } from "@/lib/visit-rules";

type VisitPayload = {
  visitorName?: string;
  visitorType?: string;
  institutionName?: string;
  phone?: string;
  serviceId?: string;
  purpose?: string;
  employeeName?: string;
  signature?: string;
  source?: string;
  consent?: boolean;
  website?: string;
  confirmDuplicate?: boolean;
};

const visitorTypes = new Set([
  "Pribadi / Masyarakat",
  "Perusahaan",
  "Instansi Pemerintah",
  "Sekolah / Perguruan Tinggi",
  "Organisasi / Lembaga",
  "Lainnya",
]);
const sources = new Set(["QR_TAMU", "FRONT_OFFICE", "KIOSK"]);

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validationError(payload: VisitPayload) {
  if (!payload || typeof payload !== "object") return "Data tidak valid.";
  for (const key of ["visitorName", "visitorType", "institutionName", "phone", "serviceId", "purpose", "employeeName", "signature", "source"] as const) {
    if (payload[key] !== undefined && typeof payload[key] !== "string") return "Data tidak valid.";
  }
  if ((payload.purpose?.length ?? 0) > 1000 || (payload.institutionName?.length ?? 0) > 180 || (payload.employeeName?.length ?? 0) > 100) return "Isian terlalu panjang.";
  const name = payload.visitorName?.trim() ?? "";
  const type = payload.visitorType?.trim() ?? "";
  const phone = normalizeIndonesianPhone(payload.phone ?? "");
  if (payload.website) return "Permintaan tidak valid.";
  if (name.length < 2 || name.length > 100) return "Nama lengkap harus diisi dengan benar.";
  if (!visitorTypes.has(type)) return "Pilih asal tamu yang tersedia.";
  if (type !== "Pribadi / Masyarakat" && !(payload.institutionName?.trim())) {
    return "Nama instansi/perusahaan perlu diisi.";
  }
  if (!isValidIndonesianPhone(phone)) return "Nomor WhatsApp harus menggunakan format 08xxxxxxxxxx.";
  if (!payload.serviceId) return "Pilih keperluan Anda.";
  if (payload.consent !== true) return "Persetujuan penggunaan data diperlukan.";
  if (!payload.signature?.startsWith("data:image/png;base64,") || payload.signature.length < 500) {
    return "Tanda tangan belum diisi.";
  }
  if (payload.signature.length > 700_000) return "Ukuran tanda tangan terlalu besar.";
  try {
    const bytes=decodeDataUrl(payload.signature);
    if(bytes.length<24 || [137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b)) return "Format tanda tangan tidak valid.";
    const view=new DataView(bytes.buffer);const width=view.getUint32(16),height=view.getUint32(20);
    if(!width||!height||width>3000||height>1200) return "Dimensi tanda tangan tidak valid.";
  } catch { return "Format tanda tangan tidak valid."; }
  return null;
}

function decodeDataUrl(value: string) {
  const base64 = value.slice(value.indexOf(",") + 1);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export async function POST(request: Request) {
  let payload: VisitPayload;
  try {
    payload = (await request.json()) as VisitPayload;
  } catch {
    return Response.json({ error: "Data tidak dapat dibaca." }, { status: 400 });
  }

  const error = validationError(payload);
  if (error) return Response.json({ error }, { status: 422 });

  try {
    await ensureSeedData();
    const db = getDb();
    const phone = normalizeIndonesianPhone(payload.phone ?? "");
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const [ipHash, phoneHash] = await Promise.all([hash(ip), hash(phone)]);
    const recentThreshold = new Date(Date.now() - 5 * 60_000).toISOString();
    const recentAttempts = await db.select().from(submissionAttempts)
      .where(and(eq(submissionAttempts.ipHash, ipHash), gt(submissionAttempts.createdAt, recentThreshold)))
      .limit(6);
    if (recentAttempts.length >= 5) {
      return Response.json({ error: "Terlalu banyak percobaan. Mohon tunggu beberapa menit." }, { status: 429 });
    }

    const duplicateThreshold = new Date(Date.now() - 2 * 60_000).toISOString();
    const [recentVisit] = await db.select({ visitCode: visits.visitCode }).from(visits)
      .where(and(eq(visits.phone, phone), gt(visits.createdAt, duplicateThreshold)))
      .orderBy(desc(visits.createdAt)).limit(1);
    if (recentVisit && !payload.confirmDuplicate) {
      return Response.json({
        code: "DUPLICATE_WARNING",
        error: "Nomor ini baru saja mengirim kunjungan. Lanjutkan jika ini keperluan baru.",
        recentVisitCode: recentVisit.visitCode,
      }, { status: 409 });
    }

    const [service] = await db.select({
      id: services.id,
      name: services.name,
      category: services.category,
      departmentId: services.departmentId,
      requiresPurpose: services.requiresPurpose,
      serviceWhatsapp: services.whatsappNumber,
      departmentName: departments.name,
      departmentWhatsapp: departments.whatsappNumber,
    }).from(services).innerJoin(departments, eq(services.departmentId, departments.id))
      .where(and(eq(services.id, payload.serviceId!), eq(services.isActive, true), eq(departments.isActive, true))).limit(1);
    if (!service) return Response.json({ error: "Layanan tidak tersedia." }, { status: 422 });
    if (needsPurpose(service) && !(payload.purpose?.trim())) {
      return Response.json({ error: "Ceritakan singkat keperluan Anda." }, { status: 422 });
    }
    const purpose = payload.purpose?.trim() || null;
    const displayedPurpose = visitPurpose(service, purpose ?? "");

    const now = new Date();
    const time = witaParts(now);
    const id = crypto.randomUUID();
    const checkoutToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,"0")).join("");
    const checkoutTokenHash = await hash(checkoutToken);
    const signaturePath = `signatures/${time.compactDate}/${id}.png`;
    await env.BUCKET.put(signaturePath, decodeDataUrl(payload.signature!), {
      httpMetadata: { contentType: "image/png" },
      customMetadata: { visitId: id },
    });

    type InsertedVisit = { id: string; visit_code: string; queue_number: number; check_in_at: string };
    let inserted: InsertedVisit | null = null;
    try {
      inserted = await env.DB.prepare(`
        INSERT INTO visits (
          id, visit_code, queue_number, visitor_name, visitor_type,
          institution_name, phone, department_id, service_id, employee_name,
          purpose, signature_path, checkout_token_hash, visit_date, check_in_at, status, source,
          consent_at, created_at, updated_at
        )
        SELECT
          ?, printf('BT-%s-%03d', ?, COALESCE(MAX(queue_number), 0) + 1),
          COALESCE(MAX(queue_number), 0) + 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'BARU', ?, ?, ?, ?
        FROM visits WHERE visit_date = ?
        RETURNING id, visit_code, queue_number, check_in_at
      `).bind(
        id,
        time.compactDate,
        payload.visitorName!.trim(),
        payload.visitorType,
        payload.institutionName?.trim() || null,
        phone,
        service.departmentId,
        service.id,
        payload.employeeName?.trim() || null,
        purpose,
        signaturePath,
        checkoutTokenHash,
        time.dateKey,
        time.timestamp,
        sources.has(payload.source ?? "") ? payload.source : "QR_TAMU",
        time.timestamp,
        time.timestamp,
        time.timestamp,
        time.dateKey,
      ).first<InsertedVisit>();
    } catch (insertError) {
      await env.BUCKET.delete(signaturePath);
      throw insertError;
    }
    if (!inserted) throw new Error("Kunjungan tidak berhasil dibuat.");

    const message = [
      "🔔 TAMU BARU - DISNAKERTRANS SULTENG",
      "",
      `Nomor : ${inserted.visit_code}`,
      `Nama   : ${payload.visitorName!.trim()}`,
      `Asal   : ${payload.institutionName?.trim() || payload.visitorType}`,
      `Keperluan: ${displayedPurpose}`,
      `Bidang    : ${service.departmentName}`,
      `Masuk  : ${time.time} WITA`,
      "",
      "Ada tamu yang menunggu pelayanan pada bidang tujuan di atas.",
    ].join("\n");
    try {
      const admins = await db.select({id:users.id,role:roles.name}).from(users).innerJoin(roles,eq(users.roleId,roles.id)).where(eq(users.isActive,true));
      const notifications=admins.filter(a=>['SUPER_ADMIN','ADMIN_BIDANG','FRONT_OFFICE'].includes(a.role)).map(a=>({
        id:id+':ARRIVAL:'+a.id,visitId:id,recipientUserId:a.id,eventType:'ARRIVAL',message,status:'AVAILABLE',createdAt:time.timestamp,updatedAt:time.timestamp,
      }));
      await db.batch([
        db.insert(submissionAttempts).values({id:crypto.randomUUID(),ipHash,phoneHash,createdAt:time.timestamp}),
        db.insert(visitStatusLogs).values({id:crypto.randomUUID(),visitId:id,toStatus:"BARU",notes:"Kunjungan dikirim oleh tamu"}),
        ...notifications.map(notification => db.insert(whatsappNotificationLogs).values(notification)),
      ]);
    } catch { console.error("visit_saved_notification_queue_failed", id); }


    return Response.json({
      visit: {
        id,
        checkoutToken,
        visitCode: inserted.visit_code,
        queueNumber: inserted.queue_number,
        checkInAt: inserted.check_in_at,
        time: time.time,
        departmentName: service.departmentName,
        serviceName: displayedPurpose,
      },
    }, { status: 201, headers: { "X-Notification-Visit-Id": id } });
  } catch (caught) {
    console.error("visit_submit_failed", caught);
    return Response.json({ error: "Terjadi kendala. Data belum terkirim, silakan coba kembali." }, { status: 500 });
  }
}
