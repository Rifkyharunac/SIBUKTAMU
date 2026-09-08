import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVisitCode,
  canTransition,
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
} from "../lib/visit-rules.ts";

test("nomor kunjungan memakai format harian yang konsisten", () => {
  assert.equal(buildVisitCode("20260828", 1), "BT-20260828-001");
  assert.equal(buildVisitCode("20260828", 125), "BT-20260828-125");
});

test("validasi dan normalisasi nomor WhatsApp Indonesia", () => {
  assert.equal(normalizeIndonesianPhone("0812-3456 7890"), "081234567890");
  assert.equal(isValidIndonesianPhone("081234567890"), true);
  assert.equal(isValidIndonesianPhone("+6281234567890"), false);
  assert.equal(isValidIndonesianPhone("08123"), false);
});

test("alur status pelayanan hanya mengizinkan transisi yang benar", () => {
  assert.equal(canTransition("BARU", "DITERIMA"), true);
  assert.equal(canTransition("DITERIMA", "SEDANG_DILAYANI"), true);
  assert.equal(canTransition("SEDANG_DILAYANI", "SELESAI"), true);
  assert.equal(canTransition("BARU", "SELESAI"), false);
  assert.equal(canTransition("SELESAI", "DITERIMA"), false);
});
