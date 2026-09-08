import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { visits } from "@/db/schema";
import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdminApi(["SUPER_ADMIN", "FRONT_OFFICE", "ADMIN_BIDANG"]);
  if ("error" in auth) return auth.error;
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key.startsWith("signatures/") || key.includes("..")) return new Response("Invalid key", { status: 400 });
  const [visit] = await getDb().select({ id: visits.id }).from(visits).where(and(eq(visits.signaturePath, key), auth.identity.role === "ADMIN_BIDANG" ? eq(visits.departmentId, auth.identity.departmentId!) : undefined)).limit(1);
  if (!visit) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: { "Content-Type": object.httpMetadata?.contentType ?? "image/png", "Cache-Control": "private, no-store" },
  });
}
