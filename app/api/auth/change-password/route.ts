import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminCredentials, adminSessions } from "@/db/schema";
import { getAdminIdentity, writeAudit, createAdminSession, sessionCookie } from "@/lib/admin-auth";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";

type PasswordPayload = { currentPassword?: string; newPassword?: string; confirmPassword?: string };

export async function POST(request: Request) {
  try {
    const identity = await getAdminIdentity();
    if (!identity) return Response.json({ error: "Sesi petugas telah berakhir. Silakan masuk kembali." }, { status: 401 });
    const payload = await request.json() as PasswordPayload;
  const currentPassword = payload.currentPassword ?? "";
  const newPassword = payload.newPassword ?? "";
  if (newPassword !== (payload.confirmPassword ?? "")) return Response.json({ error: "Konfirmasi sandi baru tidak sama." }, { status: 422 });
  const validation = validatePassword(newPassword);
  if (validation) return Response.json({ error: validation }, { status: 422 });
  if (currentPassword === newPassword) return Response.json({ error: "Sandi baru harus berbeda dari sandi sementara." }, { status: 422 });

  const db = getDb();
  const [credential] = await db.select().from(adminCredentials).where(eq(adminCredentials.userId, identity.id)).limit(1);
  if (!credential || !await verifyPassword(currentPassword, credential.passwordHash, credential.passwordSalt)) {
    return Response.json({ error: "Sandi saat ini tidak sesuai." }, { status: 401 });
  }
  const secured = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await db.update(adminCredentials).set({
    passwordHash: secured.hash,
    passwordSalt: secured.salt,
    mustChangePassword: false,
    passwordUpdatedAt: now,
    updatedAt: now,
  }).where(eq(adminCredentials.userId, identity.id));
  await db.delete(adminSessions).where(eq(adminSessions.userId, identity.id));
  const session = await createAdminSession(identity.id);
  await writeAudit({ userId: identity.id, action: "CHANGE_PASSWORD", entity: "admin_credentials", entityId: identity.id, ipAddress: request.headers.get("cf-connecting-ip") });
    return Response.json({ success: true }, { headers: { "Set-Cookie": sessionCookie(session.token) } });
  } catch (error) {
    console.error("change_password_failed", error);
    return Response.json({ error: "Sandi belum dapat diperbarui. Silakan coba kembali." }, { status: 500 });
  }
}
