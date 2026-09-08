import { env } from "cloudflare:workers";
import { stableHash } from "./password";

// One atomic counter per IP + action + time window, shared across Worker isolates.
export async function rateLimit(request: Request, action: string, limit: number, windowSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSeconds);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = await stableHash(action + ":" + ip + ":" + window);
  const result = await env.DB.prepare(
    "INSERT INTO security_rate_limits (id, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET hits = hits + 1 RETURNING hits",
  ).bind(key, (window + 2) * windowSeconds).first<{ hits: number }>();
  if (!result || result.hits > limit) return Response.json(
    { error: "Terlalu banyak permintaan. Mohon tunggu lalu coba kembali." },
    { status: 429, headers: { "Retry-After": String((window + 1) * windowSeconds - now) } },
  );
  return null;
}
