import { getD1 } from "@/db";
import { stableHash } from "@/lib/password";

// This public directory intentionally exposes only names and arrival references.
// It never returns contact details, purposes, signatures or private checkout tokens.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
  const pattern = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
  const where = "check_out_at IS NULL AND status IN ('BARU','MENUNGGU','DITERIMA','SEDANG_DILAYANI','DIALIHKAN') AND visitor_name LIKE ? ESCAPE '\\'";
  try {
    const [rows, count] = await getD1().batch([
      getD1().prepare(`SELECT id, visitor_name AS name, visit_code AS visitCode, queue_number AS queueNumber, check_in_at AS checkInAt FROM visits WHERE ${where} ORDER BY check_in_at DESC, id LIMIT 25 OFFSET ?`).bind(pattern, (page - 1) * 25),
      getD1().prepare(`SELECT COUNT(*) AS total FROM visits WHERE ${where}`).bind(pattern),
    ]);
    return Response.json({ visits: rows.results, total: Number((count.results[0] as {total:number}).total), page, pageSize: 25 }, {headers:{"Cache-Control":"private, no-store"}});
  } catch {
    return Response.json({error:"Daftar tamu belum dapat dimuat. Silakan coba kembali."}, {status:503});
  }
}

export async function POST(request: Request) {
  let payload: {visitId?: unknown};
  try { payload = await request.json(); } catch { return Response.json({error:"Data permintaan tidak valid."}, {status:400}); }
  if (!payload || typeof payload.visitId !== "string" || !/^[a-f0-9-]{36}$/i.test(payload.visitId)) return Response.json({error:"Pilih nama tamu yang akan menyelesaikan layanan."}, {status:422});
  const now = new Date().toISOString();
  const active = "id = ? AND check_out_at IS NULL AND status IN ('BARU','MENUNGGU','DITERIMA','SEDANG_DILAYANI','DIALIHKAN')";
  try {
    // D1 batch is transactional: audit and completion succeed together. A repeated
    // request cannot add another status log or change the recorded departure time.
    const [, updated] = await getD1().batch([
      getD1().prepare(`INSERT INTO visit_status_logs (id, visit_id, from_status, to_status, notes, created_at) SELECT ?, id, status, 'SELESAI', 'Selesai mandiri melalui daftar nama publik', ? FROM visits WHERE ${active}`).bind(crypto.randomUUID(), now, payload.visitId),
      getD1().prepare(`UPDATE visits SET status='SELESAI', check_out_at=?, updated_at=?, duration_minutes=MAX(0, CAST(ROUND((julianday(?) - julianday(check_in_at)) * 1440) AS INTEGER)) WHERE ${active} RETURNING visit_code AS visitCode, duration_minutes AS durationMinutes, checkout_token_hash AS checkoutTokenHash`).bind(now, now, now, payload.visitId),
    ]);
    const result = updated.results[0] as {visitCode:string;durationMinutes:number;checkoutTokenHash:string|null} | undefined;
    if (!result) return Response.json({error:"Kunjungan sudah selesai, dibatalkan, atau tidak tersedia. Daftar telah diperbarui."}, {status:409});
    return Response.json({success:true, visitCode:result.visitCode, durationMinutes:result.durationMinutes, surveyToken:result.checkoutTokenHash ? await stableHash("survey:" + result.checkoutTokenHash) : undefined},{headers:{"X-Completed-Visit-Id":payload.visitId}});
  } catch {
    return Response.json({error:"Layanan belum dapat diselesaikan. Periksa daftar sebelum mencoba kembali."}, {status:503});
  }
}
