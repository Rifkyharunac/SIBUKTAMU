import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureSeedData } from "@/db/seed";
import { departments, services, visits, settings } from "@/db/schema";
import { requireAdminApi, writeAudit } from "@/lib/admin-auth";
import { witaParts } from "@/lib/time";
import { buildExcel, buildPdf } from "@/lib/visit-report";
export const dynamic="force-dynamic";
const LABOR_DEPARTMENT_IDS=["dept-p4tk","dept-hiwas"];
function validDate(value:string|null,fallback:string){return value ?? fallback;}
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  await ensureSeedData();
  const url = new URL(request.url);
  const current = witaParts();
  const monthStart = `${current.dateKey.slice(0, 7)}-01`;
  const from = validDate(url.searchParams.get("from"), monthStart);
  const to = validDate(url.searchParams.get("to"), current.dateKey);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  if (![from,to].every(v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v)) return Response.json({error:"Tanggal tidak valid."},{status:422});
  if (from > to) return Response.json({ error: "Tanggal awal tidak boleh melewati tanggal akhir." }, { status: 400 });

  const requestedDepartment = url.searchParams.get("department")?.trim() || null;
  const departmentId = auth.identity.role === "ADMIN_BIDANG" ? auth.identity.departmentId : requestedDepartment;
  const conditions = [gte(visits.visitDate, from), lte(visits.visitDate, to)];
  if (departmentId) conditions.push(eq(visits.departmentId, departmentId));
  else conditions.push(inArray(visits.departmentId, LABOR_DEPARTMENT_IDS));

  const rows = await getDb().select({
    visitCode: visits.visitCode,
    queueNumber: visits.queueNumber,
    visitDate: visits.visitDate,
    visitorName: visits.visitorName,
    visitorType: visits.visitorType,
    institutionName: visits.institutionName,
    phone: visits.phone,
    checkInAt: visits.checkInAt,
    checkOutAt: visits.checkOutAt,
    departmentName: departments.name,
    serviceName: services.name,
    purpose: visits.purpose,
    status: visits.status,
  }).from(visits)
    .innerJoin(departments, eq(visits.departmentId, departments.id))
    .innerJoin(services, eq(visits.serviceId, services.id))
    .where(and(...conditions))
    .orderBy(asc(visits.visitDate), asc(visits.checkInAt))
    .limit(2001);
  if(rows.length>2000) return Response.json({error:"Maksimal 2.000 kunjungan per ekspor. Persempit periode laporan."},{status:422});
  if(auth.identity.role === "VIEWER") rows.forEach(row => { row.phone = row.phone.slice(0,4)+"****"+row.phone.slice(-4); });

  const [selectedDepartment] = departmentId ? await getDb().select({name:departments.name}).from(departments).where(eq(departments.id,departmentId)).limit(1) : [];
  const scope = selectedDepartment?.name || "Layanan Tenaga Kerja (P4TK dan HIWAS)";
  const config = Object.fromEntries((await getDb().select().from(settings)).map(s=>[s.key,s.value]));
  const generatedAt = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
  const filenameBase = `laporan-layanan-tenaga-kerja-${from}-${to}`;

  const options = {from,to,scope,generatedAt,signerTitle:config.report_signer_title||"Pejabat yang mengesahkan",signerName:config.report_signer_name||"",signerNip:config.report_signer_nip||"",address:config.office_address||"Jl. RA. Kartini No. 98, Palu Timur, Kota Palu"};
  await writeAudit({userId:auth.identity.id,action:"EXPORT_REPORT",entity:"visits",newValue:{from,to,format,count:rows.length,departmentId},ipAddress:request.headers.get("cf-connecting-ip")});
  if (format === "pdf") {
    const output = await buildPdf(rows, options);
    const body = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}-landscape.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const output = await buildExcel(rows, options);
  return new Response(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength) as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
