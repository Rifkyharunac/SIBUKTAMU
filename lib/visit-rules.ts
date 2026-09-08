export const VISIT_STATUSES = [
  "BARU",
  "MENUNGGU",
  "DITERIMA",
  "SEDANG_DILAYANI",
  "SELESAI",
  "DIALIHKAN",
  "BATAL",
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

const transitions: Record<VisitStatus, VisitStatus[]> = {
  BARU: ["MENUNGGU", "DITERIMA", "DIALIHKAN", "BATAL"],
  MENUNGGU: ["DITERIMA", "DIALIHKAN", "BATAL"],
  DITERIMA: ["SEDANG_DILAYANI", "DIALIHKAN", "BATAL"],
  SEDANG_DILAYANI: ["SELESAI", "DIALIHKAN", "BATAL"],
  DIALIHKAN: ["MENUNGGU", "DITERIMA", "BATAL"],
  SELESAI: [],
  BATAL: [],
};

export function isVisitStatus(value: string): value is VisitStatus {
  return VISIT_STATUSES.includes(value as VisitStatus);
}

export function canTransition(from: string, to: string) {
  return isVisitStatus(from) && isVisitStatus(to) && transitions[from].includes(to);
}

export function normalizeIndonesianPhone(value: string) {
  return value.replace(/[\s-]/g, "");
}

export function isValidIndonesianPhone(value: string) {
  return /^08\d{8,11}$/.test(normalizeIndonesianPhone(value));
}

export function buildVisitCode(compactDate: string, queueNumber: number) {
  return `BT-${compactDate}-${String(queueNumber).padStart(3, "0")}`;
}
