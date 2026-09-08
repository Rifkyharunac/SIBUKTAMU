import { env } from "cloudflare:workers";
import { and, count, eq, gt, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureSeedData } from "@/db/seed";
import { adminCredentials, adminLoginAttempts, roles, users } from "@/db/schema";
import { createAdminSession, sessionCookie, writeAudit } from "@/lib/admin-auth";
import { constantTimeTextEqual, hashPassword, stableHash, verifyPassword } from "@/lib/password";

type LoginPayload = { username?: string; password?: string };

export async function POST(request: Request) {
  try {
    let payload: LoginPayload;
    try {
    payload = await request.json() as LoginPayload;
    } catch {
      return Response.json({ error: "Data login tidak dapat dibaca." }, { status: 400 });
    }

  const username = typeof payload?.username === "string" ? payload.username.trim().toLowerCase() : "";
  const password = typeof payload?.password === "string" && payload.password.length <= 128 ? payload.password : "";
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !password) {
    return Response.json({ error: "Username atau sandi tidak sesuai." }, { status: 401 });
  }

  await ensureSeedData();
  const db = getDb();
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const [usernameHash, ipHash] = await Promise.all([stableHash(username), stableHash(ip)]);
  const threshold = new Date(Date.now() - 15 * 60_000).toISOString();
  const [recentFailures] = await db.select({ value: count() }).from(adminLoginAttempts).where(and(
    eq(adminLoginAttempts.successful, false),
    gt(adminLoginAttempts.createdAt, threshold),
    or(eq(adminLoginAttempts.usernameHash, usernameHash), eq(adminLoginAttempts.ipHash, ipHash)),
  ));
  if ((recentFailures?.value ?? 0) >= 5) {
    return Response.json({ error: "Terlalu banyak percobaan. Tunggu 15 menit sebelum mencoba kembali." }, { status: 429 });
  }

  const attempt = async (successful: boolean) => {
    await db.insert(adminLoginAttempts).values({ id: crypto.randomUUID(), usernameHash, ipHash, successful, createdAt: new Date().toISOString() });
  };

  let [account] = await db.select({
    id: users.id,
    passwordHash: adminCredentials.passwordHash,
    passwordSalt: adminCredentials.passwordSalt,
    mustChangePassword: adminCredentials.mustChangePassword,
    isActive: users.isActive,
  }).from(adminCredentials).innerJoin(users, eq(adminCredentials.userId, users.id))
    .where(eq(adminCredentials.username, username)).limit(1);

  if (!account) {
    const [existing] = await db.select({userId:adminCredentials.userId}).from(adminCredentials).limit(1);
    if (existing) { await attempt(false); return Response.json({error:"Username atau sandi tidak sesuai."},{status:401}); }
    const runtime = env as typeof env & {
      INITIAL_ADMIN_USERNAME?: string;
      INITIAL_ADMIN_PASSWORD?: string;
      INITIAL_ADMIN_EMAIL?: string;
      INITIAL_ADMIN_NAME?: string;
    };
    const initialUsername = runtime.INITIAL_ADMIN_USERNAME?.trim().toLowerCase();
    const initialPassword = runtime.INITIAL_ADMIN_PASSWORD ?? "";
    const matchesInitial = Boolean(initialUsername && initialPassword)
      && await constantTimeTextEqual(username, initialUsername!)
      && await constantTimeTextEqual(password, initialPassword);
    if (!matchesInitial) {
      await attempt(false);
      return Response.json({ error: "Username atau sandi tidak sesuai." }, { status: 401 });
    }

    let [owner] = await db.select({ id: users.id }).from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(roles.name, "SUPER_ADMIN"), eq(users.isActive, true))).limit(1);
    if (!owner) {
      const id = crypto.randomUUID();
      await db.insert(users).values({
        id,
        email: runtime.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() || "admin@sibuktamu.local",
        name: runtime.INITIAL_ADMIN_NAME?.trim() || "Administrator",
        roleId: "role-super",
      });
      owner = { id };
    }
    const secured = await hashPassword(password);
    await db.insert(adminCredentials).values({
      userId: owner.id,
      username,
      passwordHash: secured.hash,
      passwordSalt: secured.salt,
      mustChangePassword: true,
    });
    account = { id: owner.id, passwordHash: secured.hash, passwordSalt: secured.salt, mustChangePassword: true, isActive: true };
  } else if (!account.isActive || !await verifyPassword(password, account.passwordHash, account.passwordSalt)) {
    await attempt(false);
    return Response.json({ error: "Username atau sandi tidak sesuai." }, { status: 401 });
  }

  await attempt(true);
  await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.createdAt, new Date(Date.now() - 30 * 86_400_000).toISOString()));
  const session = await createAdminSession(account.id);
  await writeAudit({ userId: account.id, action: "ADMIN_LOGIN", entity: "admin_sessions", ipAddress: ip });
    return Response.json({ success: true, mustChangePassword: account.mustChangePassword }, {
      headers: { "Set-Cookie": sessionCookie(session.token), "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("admin_login_failed", error);
    return Response.json({ error: "Login sedang mengalami kendala. Silakan coba kembali beberapa saat lagi." }, { status: 500 });
  }
}
