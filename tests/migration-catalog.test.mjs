import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function applyMigration(database, name) {
  const sql = await readFile(new URL(`../drizzle/${name}`, import.meta.url), "utf8");
  database.exec(sql.replaceAll("--> statement-breakpoint", ""));
}

test("migrasi tujuan kunjungan mempertahankan riwayat dan menampilkan susunan terbaru", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("PRAGMA foreign_keys = ON");
    for (const name of [
      "0000_clammy_goliath.sql",
      "0001_opposite_kabuki.sql",
      "0002_faithful_captain_cross.sql",
      "0003_classy_greymalkin.sql",
    ]) await applyMigration(database, name);

    database.prepare("INSERT INTO departments (id, code, name, description) VALUES (?, ?, ?, ?)")
      .run("dept-upt", "UPT", "Unit Pelayanan Lama", "Data sebelum revisi");
    database.prepare("INSERT INTO services (id, department_id, name, category) VALUES (?, ?, ?, ?)")
      .run("svc-lama", "dept-upt", "Keperluan Umum Lama", "Umum");
    database.prepare(`INSERT INTO visits (
      id, visit_code, queue_number, visitor_name, visitor_type, phone,
      department_id, service_id, signature_path, visit_date, check_in_at,
      status, source, consent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        "visit-lama", "BT-20260901-001", 1, "Tamu Lama", "Pribadi / Masyarakat",
        "081234567890", "dept-upt", "svc-lama", "signatures/lama.png", "2026-09-01",
        "2026-09-01T08:00:00+08:00", "SELESAI", "QR_TAMU", "2026-09-01T08:00:00+08:00",
      );

    await applyMigration(database, "0004_official_organization_catalog.sql");
    database.prepare("UPDATE departments SET whatsapp_number = ? WHERE id = 'dept-p4tk'").run("081234567891");
    await applyMigration(database, "0005_revised_visit_destinations.sql");
    await applyMigration(database, "0006_visit_purpose_and_reception.sql");

    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM departments WHERE is_active = 1").get().total, 9);
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM services WHERE is_active = 1").get().total, 13);
    assert.equal(database.prepare("SELECT is_active FROM departments WHERE id = 'dept-upt'").get().is_active, 0);
    assert.equal(database.prepare("SELECT is_active FROM services WHERE id = 'svc-lama'").get().is_active, 0);
    assert.equal(database.prepare("SELECT whatsapp_number FROM departments WHERE id = 'dept-p4tk'").get().whatsapp_number, "081234567891");
    assert.equal(database.prepare("SELECT name FROM services WHERE id = 'svc-p4tk-penempatan'").get().name, "Penempatan dan Perluasan Kesempatan Kerja");
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM departments WHERE is_active = 1 AND name = 'Kepala Dinas'").get().total, 0);

    const lastDepartment = database.prepare("SELECT name, display_order FROM departments WHERE is_active = 1 ORDER BY display_order DESC LIMIT 1").get();
    assert.equal(lastDepartment.name, "Sekretariat Dinas");
    assert.equal(lastDepartment.display_order, 8);
    assert.deepEqual(
      database.prepare("SELECT name FROM services WHERE department_id = 'dept-sekretariat' AND is_active = 1 ORDER BY display_order").all().map((row) => row.name),
      ["Bertemu Sekretaris Dinas", "Kepegawaian", "Program", "Sub Keuangan dan Aset", "Lainnya — Sekretariat Dinas"],
    );
    const preservedVisit = database.prepare(`SELECT visits.visit_code AS code, services.name AS service
      FROM visits INNER JOIN services ON visits.service_id = services.id
      WHERE visits.id = 'visit-lama'`).get();
    assert.equal(preservedVisit.code, "BT-20260901-001");
    assert.equal(preservedVisit.service, "Keperluan Umum Lama");
    await applyMigration(database, "0007_office_photo_structure.sql");
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM services WHERE is_active=1").get().n, 29);
    assert.equal(database.prepare("SELECT name FROM departments WHERE id='dept-pembangunan'").get().name, "Bidang Pengembangan Kawasan Transmigrasi dan Penataan Persebaran Penduduk");
    assert.equal(database.prepare("SELECT department_id FROM services WHERE id='svc-kantor-persebaran'").get().department_id, "dept-pembangunan");
    assert.equal(database.prepare("SELECT name FROM services WHERE id='svc-sekretariat-kepegawaian'").get().name, "Subbagian Kepegawaian dan Umum");
    assert.equal(database.prepare("SELECT whatsapp_number FROM departments WHERE id='dept-p4tk'").get().whatsapp_number, "081234567891");
    assert.equal(database.prepare("SELECT name FROM services WHERE id='svc-p4tk-penempatan'").get().name, "Penempatan dan Perluasan Kesempatan Kerja");
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM visits WHERE id='visit-lama'").get().n, 1);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    database.close();
  }
});
