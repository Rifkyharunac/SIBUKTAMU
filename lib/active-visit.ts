export type ActiveVisitSnapshot = {
  code: string;
  resumePath: string;
  savedAt: number;
};

const STORAGE_KEY = "sibuktamu-active-visit";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CODE_PATTERN = /^BT-\d{8}-\d{3,}$/;

export function saveActiveVisit(snapshot: ActiveVisitSnapshot) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Private mode can disable storage. */ }
}

export function getActiveVisit() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ActiveVisitSnapshot>;
    const valid = typeof value.code === "string"
      && CODE_PATTERN.test(value.code)
      && typeof value.resumePath === "string"
      && value.resumePath.startsWith(`/kunjungan/sukses/${encodeURIComponent(value.code)}`)
      && typeof value.savedAt === "number"
      && Date.now() - value.savedAt < MAX_AGE_MS;
    if (!valid) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return value as ActiveVisitSnapshot;
  } catch {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    return null;
  }
}

export function clearActiveVisit(code?: string) {
  if (typeof window === "undefined") return;
  try {
  if (!code) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const active = getActiveVisit();
  if (!active || active.code === code) window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
