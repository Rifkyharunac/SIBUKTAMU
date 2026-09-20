INSERT INTO `departments` (`id`, `code`, `name`, `description`, `display_order`, `is_active`, `updated_at`) VALUES
  ('dept-p4tk', 'P4TK', 'Bidang Pembinaan Pelatihan, Perluasan Penempatan dan Produktivitas Tenaga Kerja', 'Pelatihan, perluasan kesempatan kerja, penempatan, perlindungan pekerja dan peningkatan produktivitas tenaga kerja', 0, 1, CURRENT_TIMESTAMP),
  ('dept-hiwas', 'HIWAS', 'Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan', 'Pembinaan hubungan industrial, syarat kerja, pengupahan, jaminan sosial dan pengawasan ketenagakerjaan', 1, 1, CURRENT_TIMESTAMP),
  ('dept-pkt', 'PKT', 'Bidang Perencanaan Kawasan Transmigrasi', 'Pembinaan potensi kawasan, penyediaan tanah, pelayanan pertanahan dan penataan persebaran penduduk', 2, 1, CURRENT_TIMESTAMP),
  ('dept-pembangunan', 'PKTP', 'Bidang Pembangunan Kawasan Transmigrasi dan Penataan Persebaran Penduduk', 'Penyiapan prasarana dan sarana, pengembangan usaha ekonomi serta evaluasi kawasan transmigrasi', 3, 1, CURRENT_TIMESTAMP),
  ('dept-pengembangan', 'PKTDT', 'Bidang Pengembangan Kawasan Transmigrasi dan Daerah Tertinggal', 'Pengembangan ekonomi, sumber daya manusia dan evaluasi transmigrasi serta daerah tertinggal', 4, 1, CURRENT_TIMESTAMP)
ON CONFLICT (`id`) DO UPDATE SET
  `code` = excluded.`code`,
  `name` = excluded.`name`,
  `description` = excluded.`description`,
  `display_order` = excluded.`display_order`,
  `is_active` = 1,
  `updated_at` = CURRENT_TIMESTAMP;
--> statement-breakpoint
UPDATE `departments`
SET `is_active` = 0, `updated_at` = CURRENT_TIMESTAMP
WHERE `id` NOT IN ('dept-p4tk', 'dept-hiwas', 'dept-pkt', 'dept-pembangunan', 'dept-pengembangan');
--> statement-breakpoint
UPDATE `services`
SET `is_active` = 0, `updated_at` = CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO `services` (`id`, `department_id`, `name`, `category`, `description`, `requires_purpose`, `allows_employee`, `display_order`, `is_active`, `updated_at`) VALUES
  ('svc-p4tk-penempatan', 'dept-p4tk', 'Penempatan dan Perluasan Kesempatan Kerja', 'Seksi', '', 0, 1, 0, 1, CURRENT_TIMESTAMP),
  ('svc-p4tk-perlindungan', 'dept-p4tk', 'Penempatan dan Perlindungan Pekerja', 'Seksi', '', 0, 1, 1, 1, CURRENT_TIMESTAMP),
  ('svc-p4tk-produktivitas', 'dept-p4tk', 'Peningkatan Produktivitas Tenaga Kerja', 'Seksi', '', 0, 1, 2, 1, CURRENT_TIMESTAMP),
  ('svc-lain-p4tk', 'dept-p4tk', 'Lainnya — P4TK', 'Lainnya', '', 1, 1, 3, 1, CURRENT_TIMESTAMP),
  ('svc-hiwas-organisasi', 'dept-hiwas', 'Pembinaan Organisasi Hubungan Industrial', 'Seksi', '', 0, 1, 4, 1, CURRENT_TIMESTAMP),
  ('svc-hiwas-syarat', 'dept-hiwas', 'Syarat Kerja, Pengupahan dan Jaminan Sosial', 'Seksi', '', 0, 1, 5, 1, CURRENT_TIMESTAMP),
  ('svc-hiwas-pengawasan', 'dept-hiwas', 'Pengawasan Ketenagakerjaan dan Penyelesaian Perselisihan Hubungan Industrial', 'Seksi', '', 0, 1, 6, 1, CURRENT_TIMESTAMP),
  ('svc-lain-hiwas', 'dept-hiwas', 'Lainnya — HIWAS', 'Lainnya', '', 1, 1, 7, 1, CURRENT_TIMESTAMP),
  ('svc-pkt-potensi', 'dept-pkt', 'Pembinaan Potensi Kawasan Transmigrasi', 'Seksi', '', 0, 1, 8, 1, CURRENT_TIMESTAMP),
  ('svc-pkt-pertanahan', 'dept-pkt', 'Penyediaan Tanah dan Pelayanan Pertanahan Transmigrasi', 'Seksi', '', 0, 1, 9, 1, CURRENT_TIMESTAMP),
  ('svc-pkt-persebaran', 'dept-pkt', 'Penataan Persebaran Penduduk', 'Seksi', '', 0, 1, 10, 1, CURRENT_TIMESTAMP),
  ('svc-lain-pkt', 'dept-pkt', 'Lainnya — PKT', 'Lainnya', '', 1, 1, 11, 1, CURRENT_TIMESTAMP),
  ('svc-pembangunan-prasarana', 'dept-pembangunan', 'Penyiapan Prasarana dan Sarana Permukiman dan Kawasan Transmigrasi', 'Seksi', '', 0, 1, 12, 1, CURRENT_TIMESTAMP),
  ('svc-pembangunan-ekonomi', 'dept-pembangunan', 'Penataan dan Pengembangan Usaha Ekonomi Masyarakat Transmigrasi', 'Seksi', '', 0, 1, 13, 1, CURRENT_TIMESTAMP),
  ('svc-pembangunan-evaluasi', 'dept-pembangunan', 'Evaluasi Perkembangan Permukiman, Kawasan Transmigrasi dan Sarana Prasarana Daerah Tertinggal serta Daerah Tertentu', 'Seksi', '', 0, 1, 14, 1, CURRENT_TIMESTAMP),
  ('svc-lain-pembangunan', 'dept-pembangunan', 'Lainnya — Pembangunan Kawasan', 'Lainnya', '', 1, 1, 15, 1, CURRENT_TIMESTAMP),
  ('svc-pengembangan-ekonomi', 'dept-pengembangan', 'Pengembangan Ekonomi dan Sumber Daya Manusia Masyarakat Transmigrasi, Daerah Tertinggal dan Daerah Tertentu', 'Seksi', '', 0, 1, 16, 1, CURRENT_TIMESTAMP),
  ('svc-pengembangan-evaluasi', 'dept-pengembangan', 'Evaluasi Perkembangan Transmigrasi dan Sarana Prasarana Daerah Tertinggal serta Daerah Tertentu', 'Seksi', '', 0, 1, 17, 1, CURRENT_TIMESTAMP),
  ('svc-lain-pengembangan', 'dept-pengembangan', 'Lainnya — Pengembangan Kawasan', 'Lainnya', '', 1, 1, 18, 1, CURRENT_TIMESTAMP)
ON CONFLICT (`id`) DO UPDATE SET
  `department_id` = excluded.`department_id`,
  `name` = excluded.`name`,
  `category` = excluded.`category`,
  `description` = excluded.`description`,
  `requires_purpose` = excluded.`requires_purpose`,
  `allows_employee` = excluded.`allows_employee`,
  `display_order` = excluded.`display_order`,
  `is_active` = 1,
  `updated_at` = CURRENT_TIMESTAMP;
