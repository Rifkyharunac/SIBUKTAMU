import { count, eq } from "drizzle-orm";
import { getDb } from ".";
import { departments, roles, services, settings } from "./schema";

const departmentSeed = [
  [
    "dept-p4tk",
    "P5TK",
    "Bidang Pembinaan Pelatihan Perluasan Penempatan dan Produktivitas Tenaga Kerja",
    ""
  ],
  [
    "dept-hiwas",
    "PHI-WASNAKER",
    "Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan",
    ""
  ],
  [
    "dept-pkt",
    "PERENCANAAN-KT",
    "Bidang Perencanaan Kawasan Transmigrasi",
    ""
  ],
  [
    "dept-pembangunan",
    "PKTP3",
    "Bidang Pengembangan Kawasan Transmigrasi dan Penataan Persebaran Penduduk",
    ""
  ],
  [
    "dept-pengembangan",
    "PKTDT",
    "Bidang Pengembangan Kawasan Transmigrasi Daerah Tertinggal dan Daerah Tertentu",
    ""
  ],
  [
    "dept-upt-wasnaker-1",
    "UPT-WAS-I",
    "UPT Wilayah I",
    ""
  ],
  [
    "dept-upt-wasnaker-2",
    "UPT-WAS-II",
    "UPT Wilayah II",
    ""
  ],
  [
    "dept-penerima-tamu",
    "PENERIMA-TAMU",
    "Penerima Tamu",
    "Bantuan menentukan tujuan kunjungan; antrean operasional buku tamu"
  ],
  [
    "dept-sekretariat",
    "SEKRETARIAT",
    "Sekretariat Dinas",
    "Pilih subbagian atau Sekretaris Dinas"
  ]
] as const;

const serviceSeed = [
  [
    "svc-tujuan-p5tk",
    "dept-p4tk",
    "Bertemu Kepala Bidang Pembinaan Pelatihan Perluasan Penempatan dan Produktivitas Tenaga Kerja",
    "Tujuan"
  ],
  [
    "svc-kantor-penempatan",
    "dept-p4tk",
    "Seksi Penempatan dan Perluasan Kesempatan Kerja",
    "Seksi"
  ],
  [
    "svc-kantor-pmi",
    "dept-p4tk",
    "Penempatan dan Perlindungan Pekerja Migran Indonesia",
    "Seksi"
  ],
  [
    "svc-tujuan-phi-wasnaker",
    "dept-hiwas",
    "Bertemu Kepala Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan",
    "Tujuan"
  ],
  [
    "svc-kantor-organisasi-hi",
    "dept-hiwas",
    "Seksi Pembinaan Organisasi Hubungan Industrial",
    "Seksi"
  ],
  [
    "svc-kantor-syarat-kerja",
    "dept-hiwas",
    "Seksi Syarat Kerja, Pengupahan dan Jaminan Sosial",
    "Seksi"
  ],
  [
    "svc-tujuan-perencanaan-kt",
    "dept-pkt",
    "Bertemu Kepala Bidang Perencanaan Kawasan Transmigrasi",
    "Tujuan"
  ],
  [
    "svc-kantor-potensi",
    "dept-pkt",
    "Pembinaan Potensi Kawasan",
    "Seksi"
  ],
  [
    "svc-kantor-pertanahan",
    "dept-pkt",
    "Seksi Penyediaan Tanah dan Pelayanan Pertanahan Transmigrasi",
    "Seksi"
  ],
  [
    "svc-tujuan-pktp3",
    "dept-pembangunan",
    "Bertemu Kepala Bidang Pengembangan Kawasan Transmigrasi dan Penataan Persebaran Penduduk",
    "Tujuan"
  ],
  [
    "svc-kantor-prasarana",
    "dept-pembangunan",
    "Penyiapan Prasarana dan Sarana Permukiman dan Transmigrasi",
    "Seksi"
  ],
  [
    "svc-kantor-persebaran",
    "dept-pembangunan",
    "Penataan dan Persebaran Penduduk",
    "Seksi"
  ],
  [
    "svc-tujuan-pktdt",
    "dept-pengembangan",
    "Bertemu Kepala Bidang Pengembangan Kawasan Transmigrasi Daerah Tertinggal dan Daerah Tertentu",
    "Tujuan"
  ],
  [
    "svc-kantor-ekonomi-sdm",
    "dept-pengembangan",
    "Pengembangan Ekonomi dan SDM Masyarakat Transmigrasi, Daerah Tertinggal dan Daerah Tertentu",
    "Seksi"
  ],
  [
    "svc-kantor-evaluasi",
    "dept-pengembangan",
    "Evaluasi Perkembangan Permukiman Kawasan Transmigrasi dan Sarana Prasarana Daerah Tertinggal dan Daerah Tertentu",
    "Seksi"
  ],
  [
    "svc-tujuan-upt-wasnaker-1",
    "dept-upt-wasnaker-1",
    "Bertemu Kepala UPT Wilayah I",
    "Tujuan"
  ],
  [
    "svc-kantor-upt-1-tu",
    "dept-upt-wasnaker-1",
    "Subbagian Tata Usaha — UPT Wilayah I",
    "Subbagian"
  ],
  [
    "svc-kantor-upt-1-norma",
    "dept-upt-wasnaker-1",
    "Pengawasan Norma Kerja — UPT Wilayah I",
    "Seksi"
  ],
  [
    "svc-kantor-upt-1-k3",
    "dept-upt-wasnaker-1",
    "Pengawasan Norma Kesehatan dan Keselamatan Kerja — UPT Wilayah I",
    "Seksi"
  ],
  [
    "svc-tujuan-upt-wasnaker-2",
    "dept-upt-wasnaker-2",
    "Bertemu Kepala UPT Wilayah II",
    "Tujuan"
  ],
  [
    "svc-kantor-upt-2-tu",
    "dept-upt-wasnaker-2",
    "Subbagian Tata Usaha — UPT Wilayah II",
    "Subbagian"
  ],
  [
    "svc-kantor-upt-2-norma",
    "dept-upt-wasnaker-2",
    "Pengawasan Norma Kerja — UPT Wilayah II",
    "Seksi"
  ],
  [
    "svc-kantor-upt-2-k3",
    "dept-upt-wasnaker-2",
    "Pengawasan Norma Kesehatan dan Keselamatan Kerja — UPT Wilayah II",
    "Seksi"
  ],
  [
    "svc-lain-tujuan",
    "dept-penerima-tamu",
    "Lainnya / Belum tahu tujuan",
    "Tujuan"
  ],
  [
    "svc-sekretariat-sekretaris",
    "dept-sekretariat",
    "Bertemu Sekretaris Dinas",
    "Bagian Sekretariat"
  ],
  [
    "svc-sekretariat-program",
    "dept-sekretariat",
    "Subbagian Program",
    "Bagian Sekretariat"
  ],
  [
    "svc-sekretariat-keuangan-aset",
    "dept-sekretariat",
    "Subbagian Keuangan dan Aset",
    "Bagian Sekretariat"
  ],
  [
    "svc-sekretariat-kepegawaian",
    "dept-sekretariat",
    "Subbagian Kepegawaian dan Umum",
    "Bagian Sekretariat"
  ],
  [
    "svc-lain-sekretariat",
    "dept-sekretariat",
    "Lainnya — Sekretariat Dinas",
    "Lainnya"
  ]
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
      requiresPurpose: name.startsWith("Lainnya"),
    }));
    // D1 membatasi jumlah parameter terikat per pernyataan. Penanaman data
    // layanan dipecah agar deployment baru tidak gagal di tengah proses seed.
    for (let index = 0; index < serviceValues.length; index += 10) {
      await db.insert(services).values(serviceValues.slice(index, index + 10)).onConflictDoNothing();
    }
  }

  const activeDepartments = await db.select().from(departments).where(eq(departments.isActive, true));
  const existingServices = await db.select().from(services);
  for (const department of activeDepartments) {
    if (!existingServices.some(service => service.departmentId === department.id && service.isActive && (service.category === "Lainnya" || service.name.startsWith("Lainnya")))) {
      await db.insert(services).values({ id: `svc-other-${department.id}`, departmentId: department.id,
        name: `Lainnya — ${department.name}`, category: "Lainnya", requiresPurpose: true, displayOrder: 999 }).onConflictDoNothing();
    }
  }

  await db.insert(settings).values([
    { key: "report_signer_title", value: "Pejabat yang mengesahkan" },
    { key: "report_signer_name", value: "" },
    { key: "report_signer_nip", value: "" },
    { key: "office_name", value: "Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah" },
    { key: "office_address", value: "Jl. RA. Kartini No. 98, Kel. Lolu Selatan, Kec. Palu Timur, Kota Palu" },
    { key: "office_hours", value: "Senin–Jumat, 08.00–15.00 WITA" },
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
