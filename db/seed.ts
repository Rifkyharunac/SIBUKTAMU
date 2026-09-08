import { count, eq } from "drizzle-orm";
import { getDb } from ".";
import { departments, roles, services, settings } from "./schema";

const departmentSeed = [
  ["dept-sekretariat", "SEK", "Sekretariat", "Administrasi umum, persuratan, program, keuangan dan koordinasi"],
  ["dept-p4tk", "P4TK", "Bidang Pembinaan Pelatihan, Perluasan Penempatan dan Produktivitas Tenaga Kerja", "Pelatihan, lowongan, penempatan, produktivitas dan pekerja migran"],
  ["dept-hiwas", "HIWAS", "Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan", "Hubungan industrial, pengupahan, jaminan sosial dan pengawasan"],
  ["dept-pkt", "PKT", "Bidang Perencanaan Kawasan Transmigrasi", "Perencanaan, potensi dan pertanahan kawasan transmigrasi"],
  ["dept-pembangunan", "PKTP", "Bidang Pembangunan Kawasan Transmigrasi dan Penataan Persebaran Penduduk", "Pembangunan sarana kawasan dan penataan persebaran penduduk"],
  ["dept-pengembangan", "PKTDT", "Bidang Pengembangan Kawasan Transmigrasi, Daerah Tertinggal dan Daerah Tertentu", "Pengembangan ekonomi, SDM dan evaluasi kawasan transmigrasi"],
  ["dept-upt", "UPT", "UPT / Unit Pelayanan Lainnya", "Unit pelayanan teknis dan layanan umum lainnya"],
] as const;

const serviceSeed = [
  ["svc-lowongan", "dept-p4tk", "Pencari Kerja / Lowongan Kerja", "Ketenagakerjaan"],
  ["svc-pelatihan", "dept-p4tk", "Pelatihan Kerja", "Ketenagakerjaan"],
  ["svc-penempatan", "dept-p4tk", "Penempatan Tenaga Kerja", "Ketenagakerjaan"],
  ["svc-pmi", "dept-p4tk", "Informasi Pekerja Migran Indonesia", "Ketenagakerjaan"],
  ["svc-hi", "dept-hiwas", "Hubungan Industrial", "Hubungan Industrial"],
  ["svc-perselisihan", "dept-hiwas", "Konsultasi Perselisihan Hubungan Industrial", "Hubungan Industrial"],
  ["svc-upah", "dept-hiwas", "Pengupahan / UMP / UMSP", "Hubungan Industrial"],
  ["svc-jamsos", "dept-hiwas", "Jaminan Sosial Tenaga Kerja", "Hubungan Industrial"],
  ["svc-pengawasan", "dept-hiwas", "Pengawasan Ketenagakerjaan", "Pengawasan"],
  ["svc-pengaduan", "dept-hiwas", "Pengaduan Masalah Ketenagakerjaan", "Pengawasan"],
  ["svc-perusahaan", "dept-hiwas", "Informasi Perusahaan", "Pengawasan"],
  ["svc-konsultasi-trans", "dept-pkt", "Konsultasi Transmigrasi", "Transmigrasi"],
  ["svc-kawasan", "dept-pkt", "Informasi Kawasan Transmigrasi", "Transmigrasi"],
  ["svc-pertanahan", "dept-pkt", "Pertanahan Transmigrasi", "Transmigrasi"],
  ["svc-sarana", "dept-pembangunan", "Pembangunan / Sarana Kawasan Transmigrasi", "Transmigrasi"],
  ["svc-ekonomi", "dept-pengembangan", "Pengembangan Ekonomi Masyarakat Transmigrasi", "Transmigrasi"],
  ["svc-data", "dept-sekretariat", "Permintaan Data / Informasi", "Informasi"],
  ["svc-ppid", "dept-sekretariat", "PPID / Informasi Publik", "Informasi"],
  ["svc-surat", "dept-sekretariat", "Persuratan", "Administrasi"],
  ["svc-audiensi", "dept-sekretariat", "Audiensi / Koordinasi", "Administrasi"],
  ["svc-akademik", "dept-sekretariat", "Penelitian / Magang / Akademik", "Administrasi"],
  ["svc-pegawai", "dept-sekretariat", "Bertemu Pegawai", "Administrasi"],
  ["svc-rapat", "dept-sekretariat", "Undangan / Rapat", "Administrasi"],
  ["svc-umum", "dept-upt", "Keperluan Umum", "Umum"],
  ["svc-lain", "dept-upt", "Lainnya", "Umum"],
] as const;

let seeded = false;
export async function ensureSeedData() {
  if (seeded) return getDb();
  const db = await seedData();
  seeded = true;
  return db;
}
async function seedData() {
  const db = getDb();
  await db.insert(roles).values([
    { id: "role-super", name: "SUPER_ADMIN", label: "Super Admin" },
    { id: "role-front", name: "FRONT_OFFICE", label: "Front Office" },
    { id: "role-department", name: "ADMIN_BIDANG", label: "Admin Bidang" },
    { id: "role-viewer", name: "VIEWER", label: "Pimpinan / Viewer" },
  ]).onConflictDoNothing();

  const [departmentCount] = await db.select({ value: count() }).from(departments);
  if ((departmentCount?.value ?? 0) === 0) {
    await db.insert(departments).values(
      departmentSeed.map(([id, code, name, description], displayOrder) => ({ id, code, name, description, displayOrder })),
    ).onConflictDoNothing();
  }

  const [serviceCount] = await db.select({ value: count() }).from(services);
  if ((serviceCount?.value ?? 0) === 0) {
    const serviceValues = serviceSeed.map(([id, departmentId, name, category], displayOrder) => ({
      id,
      departmentId,
      name,
      category,
      displayOrder,
      requiresPurpose: id === "svc-lain" || id === "svc-pengaduan",
    }));
    // D1 membatasi jumlah parameter terikat per pernyataan. Penanaman data
    // layanan dipecah agar deployment baru tidak gagal di tengah proses seed.
    for (let index = 0; index < serviceValues.length; index += 10) {
      await db.insert(services).values(serviceValues.slice(index, index + 10)).onConflictDoNothing();
    }
  }

  await db.insert(settings).values([
    { key: "report_signer_title", value: "Pejabat yang mengesahkan" },
    { key: "report_signer_name", value: "" },
    { key: "report_signer_nip", value: "" },
    { key: "office_name", value: "Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah" },
    { key: "office_address", value: "Jl. RA. Kartini No. 98, Palu Timur, Kota Palu" },
    { key: "office_hours", value: "Senin–Jumat, 08.00–16.00 WITA" },
    { key: "allow_outside_hours", value: "true" },
    { key: "data_retention", value: "Sesuai kebijakan administrator dan ketentuan kearsipan yang berlaku" },
  ]).onConflictDoNothing();

  return db;
}

export async function getPublicCatalog() {
  const db = await ensureSeedData();
  const departmentRows = await db.select().from(departments).where(eq(departments.isActive, true)).orderBy(departments.displayOrder);
  const serviceRows = await db.select().from(services).where(eq(services.isActive, true)).orderBy(services.displayOrder);
  return { departments: departmentRows.map(({id,name,code,description}) => ({id,name,code,description})), services: serviceRows.filter(s => departmentRows.some(d => d.id === s.departmentId)).map(({id,name,departmentId,description,category,requiresPurpose,allowsEmployee}) => ({id,name,departmentId,description,category,requiresPurpose,allowsEmployee})) };
}
