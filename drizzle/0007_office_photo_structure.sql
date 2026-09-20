-- Acuan: foto papan struktur kantor IMG-20260916-WA0012.jpg.jpeg.
-- Identitas bidang dipertahankan agar akun dan nomor penerima tetap terhubung.
INSERT INTO departments (id,code,name,description,display_order,is_active) VALUES
('dept-p4tk','P5TK','Bidang Pembinaan Pelatihan Perluasan Penempatan dan Produktivitas Tenaga Kerja','',0,1),
('dept-hiwas','PHI-WASNAKER','Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan','',1,1),
('dept-pkt','PERENCANAAN-KT','Bidang Perencanaan Kawasan Transmigrasi','',2,1),
('dept-pembangunan','PKTP3','Bidang Pengembangan Kawasan Transmigrasi dan Penataan Persebaran Penduduk','',3,1),
('dept-pengembangan','PKTDT','Bidang Pengembangan Kawasan Transmigrasi Daerah Tertinggal dan Daerah Tertentu','',4,1),
('dept-upt-wasnaker-1','UPT-WAS-I','UPT Wilayah I','',5,1),
('dept-upt-wasnaker-2','UPT-WAS-II','UPT Wilayah II','',6,1),
('dept-penerima-tamu','PENERIMA-TAMU','Penerima Tamu','Bantuan menentukan tujuan kunjungan; antrean operasional buku tamu',7,1),
('dept-sekretariat','SEKRETARIAT','Sekretariat Dinas','Pilih subbagian atau Sekretaris Dinas',8,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
UPDATE services SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE department_id IN ('dept-p4tk','dept-hiwas','dept-pkt','dept-pembangunan','dept-pengembangan','dept-upt-wasnaker-1','dept-upt-wasnaker-2','dept-penerima-tamu','dept-sekretariat') AND id NOT IN ('svc-tujuan-p5tk','svc-kantor-penempatan','svc-kantor-pmi','svc-tujuan-phi-wasnaker','svc-kantor-organisasi-hi','svc-kantor-syarat-kerja','svc-tujuan-perencanaan-kt','svc-kantor-potensi','svc-kantor-pertanahan','svc-tujuan-pktp3','svc-kantor-prasarana','svc-kantor-persebaran','svc-tujuan-pktdt','svc-kantor-ekonomi-sdm','svc-kantor-evaluasi','svc-tujuan-upt-wasnaker-1','svc-kantor-upt-1-tu','svc-kantor-upt-1-norma','svc-kantor-upt-1-k3','svc-tujuan-upt-wasnaker-2','svc-kantor-upt-2-tu','svc-kantor-upt-2-norma','svc-kantor-upt-2-k3','svc-lain-tujuan','svc-sekretariat-sekretaris','svc-sekretariat-program','svc-sekretariat-keuangan-aset','svc-sekretariat-kepegawaian','svc-lain-sekretariat');
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-p5tk','dept-p4tk','Bertemu Kepala Bidang Pembinaan Pelatihan Perluasan Penempatan dan Produktivitas Tenaga Kerja','Tujuan',1,1,0,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-penempatan','dept-p4tk','Seksi Penempatan dan Perluasan Kesempatan Kerja','Seksi',1,1,1,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-pmi','dept-p4tk','Penempatan dan Perlindungan Pekerja Migran Indonesia','Seksi',1,1,2,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-phi-wasnaker','dept-hiwas','Bertemu Kepala Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan','Tujuan',1,1,3,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-organisasi-hi','dept-hiwas','Seksi Pembinaan Organisasi Hubungan Industrial','Seksi',1,1,4,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-syarat-kerja','dept-hiwas','Seksi Syarat Kerja, Pengupahan dan Jaminan Sosial','Seksi',1,1,5,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-perencanaan-kt','dept-pkt','Bertemu Kepala Bidang Perencanaan Kawasan Transmigrasi','Tujuan',1,1,6,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-potensi','dept-pkt','Pembinaan Potensi Kawasan','Seksi',1,1,7,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-pertanahan','dept-pkt','Seksi Penyediaan Tanah dan Pelayanan Pertanahan Transmigrasi','Seksi',1,1,8,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-pktp3','dept-pembangunan','Bertemu Kepala Bidang Pengembangan Kawasan Transmigrasi dan Penataan Persebaran Penduduk','Tujuan',1,1,9,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-prasarana','dept-pembangunan','Penyiapan Prasarana dan Sarana Permukiman dan Transmigrasi','Seksi',1,1,10,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-persebaran','dept-pembangunan','Penataan dan Persebaran Penduduk','Seksi',1,1,11,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-pktdt','dept-pengembangan','Bertemu Kepala Bidang Pengembangan Kawasan Transmigrasi Daerah Tertinggal dan Daerah Tertentu','Tujuan',1,1,12,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-ekonomi-sdm','dept-pengembangan','Pengembangan Ekonomi dan SDM Masyarakat Transmigrasi, Daerah Tertinggal dan Daerah Tertentu','Seksi',1,1,13,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-evaluasi','dept-pengembangan','Evaluasi Perkembangan Permukiman Kawasan Transmigrasi dan Sarana Prasarana Daerah Tertinggal dan Daerah Tertentu','Seksi',1,1,14,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-upt-wasnaker-1','dept-upt-wasnaker-1','Bertemu Kepala UPT Wilayah I','Tujuan',1,1,15,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-upt-1-tu','dept-upt-wasnaker-1','Subbagian Tata Usaha — UPT Wilayah I','Subbagian',1,1,16,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-upt-1-norma','dept-upt-wasnaker-1','Pengawasan Norma Kerja — UPT Wilayah I','Seksi',1,1,17,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-upt-1-k3','dept-upt-wasnaker-1','Pengawasan Norma Kesehatan dan Keselamatan Kerja — UPT Wilayah I','Seksi',1,1,18,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-tujuan-upt-wasnaker-2','dept-upt-wasnaker-2','Bertemu Kepala UPT Wilayah II','Tujuan',1,1,19,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-upt-2-tu','dept-upt-wasnaker-2','Subbagian Tata Usaha — UPT Wilayah II','Subbagian',1,1,20,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-upt-2-norma','dept-upt-wasnaker-2','Pengawasan Norma Kerja — UPT Wilayah II','Seksi',1,1,21,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-kantor-upt-2-k3','dept-upt-wasnaker-2','Pengawasan Norma Kesehatan dan Keselamatan Kerja — UPT Wilayah II','Seksi',1,1,22,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-lain-tujuan','dept-penerima-tamu','Lainnya / Belum tahu tujuan','Tujuan',1,1,23,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-sekretariat-sekretaris','dept-sekretariat','Bertemu Sekretaris Dinas','Bagian Sekretariat',1,1,24,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-sekretariat-program','dept-sekretariat','Subbagian Program','Bagian Sekretariat',1,1,25,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-sekretariat-keuangan-aset','dept-sekretariat','Subbagian Keuangan dan Aset','Bagian Sekretariat',1,1,26,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-sekretariat-kepegawaian','dept-sekretariat','Subbagian Kepegawaian dan Umum','Bagian Sekretariat',1,1,27,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO services (id,department_id,name,category,requires_purpose,allows_employee,display_order,is_active) VALUES ('svc-lain-sekretariat','dept-sekretariat','Lainnya — Sekretariat Dinas','Lainnya',1,1,28,1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, requires_purpose=1, display_order=excluded.display_order, is_active=1, updated_at=CURRENT_TIMESTAMP;
