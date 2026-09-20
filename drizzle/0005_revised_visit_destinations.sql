INSERT INTO `departments` (`id`, `code`, `name`, `description`, `display_order`, `is_active`, `updated_at`) VALUES
  ('dept-p4tk', 'P5TK', 'Kabid P5TK', 'Pembinaan, pelatihan, perluasan kesempatan kerja, penempatan, dan produktivitas tenaga kerja', 0, 1, CURRENT_TIMESTAMP),
  ('dept-hiwas', 'PHI-WASNAKER', 'Kabid PHI Wasnaker', 'Hubungan industrial dan pengawasan ketenagakerjaan', 1, 1, CURRENT_TIMESTAMP),
  ('dept-pkt', 'PERENCANAAN-KT', 'Kabid Perencanaan KT', 'Perencanaan kawasan transmigrasi', 2, 1, CURRENT_TIMESTAMP),
  ('dept-pembangunan', 'PKTP3', 'Kabid PKTP3', 'Pembangunan kawasan transmigrasi dan penataan persebaran penduduk', 3, 1, CURRENT_TIMESTAMP),
  ('dept-pengembangan', 'PKTDT', 'Kabid PKTDT', 'Pengembangan kawasan transmigrasi dan daerah tertinggal', 4, 1, CURRENT_TIMESTAMP),
  ('dept-upt-wasnaker-1', 'UPT-WAS-I', 'Ka. UPT Wasnaker Wilayah I', 'Unit Pelaksana Teknis Pengawasan Ketenagakerjaan Wilayah I', 5, 1, CURRENT_TIMESTAMP),
  ('dept-upt-wasnaker-2', 'UPT-WAS-II', 'Ka. UPT Wasnaker Wilayah II', 'Unit Pelaksana Teknis Pengawasan Ketenagakerjaan Wilayah II', 6, 1, CURRENT_TIMESTAMP),
  ('dept-sekretariat', 'SEKRETARIAT', 'Sekretariat Dinas', 'Pilih bagian Sekretariat yang ingin dituju', 7, 1, CURRENT_TIMESTAMP)
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
WHERE `id` NOT IN (
  'dept-p4tk',
  'dept-hiwas',
  'dept-pkt',
  'dept-pembangunan',
  'dept-pengembangan',
  'dept-upt-wasnaker-1',
  'dept-upt-wasnaker-2',
  'dept-sekretariat'
);
--> statement-breakpoint
UPDATE `services`
SET `is_active` = 0, `updated_at` = CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO `services` (`id`, `department_id`, `name`, `category`, `description`, `requires_purpose`, `allows_employee`, `display_order`, `is_active`, `updated_at`) VALUES
  ('svc-tujuan-p5tk', 'dept-p4tk', 'Kabid P5TK', 'Tujuan', '', 0, 1, 0, 1, CURRENT_TIMESTAMP),
  ('svc-tujuan-phi-wasnaker', 'dept-hiwas', 'Kabid PHI Wasnaker', 'Tujuan', '', 0, 1, 1, 1, CURRENT_TIMESTAMP),
  ('svc-tujuan-perencanaan-kt', 'dept-pkt', 'Kabid Perencanaan KT', 'Tujuan', '', 0, 1, 2, 1, CURRENT_TIMESTAMP),
  ('svc-tujuan-pktp3', 'dept-pembangunan', 'Kabid PKTP3', 'Tujuan', '', 0, 1, 3, 1, CURRENT_TIMESTAMP),
  ('svc-tujuan-pktdt', 'dept-pengembangan', 'Kabid PKTDT', 'Tujuan', '', 0, 1, 4, 1, CURRENT_TIMESTAMP),
  ('svc-tujuan-upt-wasnaker-1', 'dept-upt-wasnaker-1', 'Ka. UPT Wasnaker Wilayah I', 'Tujuan', '', 0, 1, 5, 1, CURRENT_TIMESTAMP),
  ('svc-tujuan-upt-wasnaker-2', 'dept-upt-wasnaker-2', 'Ka. UPT Wasnaker Wilayah II', 'Tujuan', '', 0, 1, 6, 1, CURRENT_TIMESTAMP),
  ('svc-sekretariat-kepegawaian', 'dept-sekretariat', 'Kepegawaian', 'Bagian Sekretariat', '', 0, 1, 7, 1, CURRENT_TIMESTAMP),
  ('svc-sekretariat-program', 'dept-sekretariat', 'Program', 'Bagian Sekretariat', '', 0, 1, 8, 1, CURRENT_TIMESTAMP),
  ('svc-sekretariat-keuangan-aset', 'dept-sekretariat', 'Sub Keuangan dan Aset', 'Bagian Sekretariat', '', 0, 1, 9, 1, CURRENT_TIMESTAMP),
  ('svc-lain-sekretariat', 'dept-sekretariat', 'Lainnya — Sekretariat Dinas', 'Lainnya', '', 1, 1, 10, 1, CURRENT_TIMESTAMP)
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
