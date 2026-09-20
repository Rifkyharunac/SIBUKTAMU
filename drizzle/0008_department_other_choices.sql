-- Correct default service requirements without changing historical visits or custom services.
UPDATE services SET requires_purpose = CASE WHEN name LIKE 'Lainnya%' THEN 1 ELSE 0 END WHERE id IN ('svc-tujuan-p5tk','svc-kantor-penempatan','svc-kantor-pmi','svc-tujuan-phi-wasnaker','svc-kantor-organisasi-hi','svc-kantor-syarat-kerja','svc-tujuan-perencanaan-kt','svc-kantor-potensi','svc-kantor-pertanahan','svc-tujuan-pktp3','svc-kantor-prasarana','svc-kantor-persebaran','svc-tujuan-pktdt','svc-kantor-ekonomi-sdm','svc-kantor-evaluasi','svc-tujuan-upt-wasnaker-1','svc-kantor-upt-1-tu','svc-kantor-upt-1-norma','svc-kantor-upt-1-k3','svc-tujuan-upt-wasnaker-2','svc-kantor-upt-2-tu','svc-kantor-upt-2-norma','svc-kantor-upt-2-k3','svc-lain-tujuan','svc-sekretariat-sekretaris','svc-sekretariat-program','svc-sekretariat-keuangan-aset','svc-sekretariat-kepegawaian','svc-lain-sekretariat');
--> statement-breakpoint
INSERT OR IGNORE INTO services (id, department_id, name, category, requires_purpose, allows_employee, display_order, is_active)
SELECT 'svc-other-' || d.id, d.id, 'Lainnya — ' || d.name, 'Lainnya', 1, 1, 999, 1
FROM departments d WHERE d.is_active = 1 AND NOT EXISTS (
 SELECT 1 FROM services s WHERE s.department_id = d.id AND s.is_active = 1 AND (s.category = 'Lainnya' OR s.name LIKE 'Lainnya%')
);
