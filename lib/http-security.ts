// Every state-changing browser request must originate from this application.
export function rejectUnsafeRequest(request: Request): Response | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  // Native form POSTs under no-referrer legitimately send Origin: null.
  // Accept opaque/missing origins only with the browser's same-origin metadata;
  // never trust a Referer or a client-supplied forwarded host instead.
  const concreteOrigin = origin && origin !== "null";
  if ((concreteOrigin && origin !== new URL(request.url).origin)
    || (site && site !== "same-origin") || (!concreteOrigin && site !== "same-origin")) {
    return Response.json({ error: "Permintaan tidak berasal dari halaman aplikasi. Muat ulang dan coba kembali." }, { status: 403 });
  }
  if (new URL(request.url).pathname !== "/api/auth/logout"
    && request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return Response.json({ error: "Format permintaan tidak didukung." }, { status: 415 });
  }
  return null;
}

export function secureResponse(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
  if (new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000");
  const path = new URL(request.url).pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/") || path.startsWith("/kunjungan/sukses") || path === "/checkout") {
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  headers.delete("X-Powered-By");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function boundedJsonRequest(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return request;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Request(request.url, { method: request.method, headers: request.headers, body: bytes });
}
