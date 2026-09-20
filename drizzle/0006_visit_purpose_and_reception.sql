INSERT INTO departments (id, code, name, description, display_order, is_active)
VALUES ('dept-penerima-tamu','PENERIMA-TAMU','Penerima Tamu','Bantuan menentukan tujuan kunjungan',7,1);
--> statement-breakpoint
UPDATE departments SET display_order = 8 WHERE id = 'dept-sekretariat';
--> statement-breakpoint
UPDATE departments SET description = '' WHERE id IN ('dept-p4tk','dept-hiwas','dept-pkt','dept-pembangunan','dept-pengembangan');
--> statement-breakpoint
INSERT INTO services (id, department_id, name, category, requires_purpose, display_order, is_active) VALUES
('svc-lain-tujuan','dept-penerima-tamu','Lainnya / Belum tahu tujuan','Tujuan',1,7,1),
('svc-sekretariat-sekretaris','dept-sekretariat','Bertemu Sekretaris Dinas','Bagian Sekretariat',1,8,1);
--> statement-breakpoint
UPDATE services SET display_order = display_order + 2 WHERE department_id = 'dept-sekretariat' AND id != 'svc-sekretariat-sekretaris';
--> statement-breakpoint
UPDATE services SET requires_purpose = 1 WHERE is_active = 1;
--> statement-breakpoint
INSERT INTO settings (key,value) VALUES ('office_hours','Senin–Jumat, 08.00–15.00 WITA')
ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value='Senin–Jumat, 08.00–16.00 WITA';
--> statement-breakpoint
INSERT INTO settings (key,value) VALUES ('office_address','Jl. RA. Kartini No. 98, Kel. Lolu Selatan, Kec. Palu Timur, Kota Palu')
ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value='Jl. RA. Kartini No. 98, Palu Timur, Kota Palu';
