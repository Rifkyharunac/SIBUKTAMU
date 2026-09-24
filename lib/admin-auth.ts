import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureSeedData } from "@/db/seed";
import { adminCredentials, adminSessions, auditLogs, roles, users } from "@/db/schema";
import { stableHash } from "@/lib/password";

export const ADMIN_SESSION_COOKIE = "sibuktamu_session";
export const SESSION_DURATION_SECONDS = 400 * 24 * 60 * 60;

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  roleLabel: string;
  departmentId: string | null;
  mustChangePassword: boolean;
};

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
  } catch { return null; }
}

export function sessionCookie(token: string) {
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createAdminSession(userId: string) {
  const db = getDb();
  const token = randomToken();
  const id = await stableHash(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000).toISOString();
  await db.insert(adminSessions).values({ id, userId, expiresAt, lastSeenAt: now.toISOString() });
  return { token, expiresAt };
}

export async function deleteAdminSession(token: string | null) {
  if (!token) return;
  const db = getDb();
  await db.delete(adminSessions).where(eq(adminSessions.id, await stableHash(token)));
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await ensureSeedData();
  const db = getDb();
  const sessionId = await stableHash(token);
  const now = new Date().toISOString();
  const [identity] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    username: adminCredentials.username,
    role: roles.name,
    roleLabel: roles.label,
    departmentId: users.departmentId,
    mustChangePassword: adminCredentials.mustChangePassword,
    lastSeenAt: adminSessions.lastSeenAt,
  }).from(adminSessions)
    .innerJoin(users, eq(adminSessions.userId, users.id))
    .innerJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(adminCredentials, eq(adminCredentials.userId, users.id))
    .where(and(eq(adminSessions.id, sessionId), gt(adminSessions.expiresAt, now), eq(users.isActive, true)))
    .limit(1);
  if (!identity) return null;

  if (Date.now() - new Date(identity.lastSeenAt).getTime() > 5 * 60_000) {
    await Promise.all([
      db.update(adminSessions).set({ lastSeenAt: now, expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString() }).where(eq(adminSessions.id, sessionId)),
      db.update(users).set({ lastSeenAt: now }).where(eq(users.id, identity.id)),
    ]);
  }
  // Existing department admins share the same full administrator permissions.
  return { ...identity, role: identity.role === "ADMIN_BIDANG" ? "SUPER_ADMIN" : identity.role, roleLabel: ["SUPER_ADMIN", "ADMIN_BIDANG"].includes(identity.role) ? "Admin" : identity.roleLabel };
}

export async function requireAdminApi(
  allowed: string[] = ["SUPER_ADMIN", "FRONT_OFFICE", "ADMIN_BIDANG", "VIEWER"],
): Promise<{error: Response} | {identity: AdminIdentity}> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { error: Response.json({ error: "Sesi petugas telah berakhir. Silakan masuk kembali." }, { status: 401 }) } as const;
  }
  if (identity.mustChangePassword) {
    return { error: Response.json({ error: "Ganti sandi sementara sebelum menggunakan dashboard." }, { status: 403 }) } as const;
  }
  if (!allowed.includes(identity.role)) {
    return { error: Response.json({ error: "Anda tidak memiliki kewenangan untuk tindakan ini." }, { status: 403 }) } as const;
  }
  return { identity } as const;
}

export async function writeAudit(input: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    oldValue: input.oldValue === undefined ? null : JSON.stringify(input.oldValue),
    newValue: input.newValue === undefined ? null : JSON.stringify(input.newValue),
    ipAddress: input.ipAddress ?? null,
  });
}
