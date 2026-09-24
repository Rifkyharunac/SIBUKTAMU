export type WhatsAppEnvironment = {
  WHATSAPP_PROVIDER?: string; WHATSAPP_API_URL?: string; WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string; WAHA_API_URL?: string; WAHA_API_KEY?: string; WAHA_SESSION?: string;
};

export function whatsappConfiguration(env: WhatsAppEnvironment) {
  const provider = (env.WHATSAPP_PROVIDER || "meta").trim().toLowerCase();
  const configured = provider === "waha"
    ? Boolean(env.WAHA_API_URL?.trim() && env.WAHA_API_KEY?.trim())
    : provider === "meta" && Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
  return { provider, whatsappConfigured: configured };
}

export class WahaError extends Error {
  code: string;
  httpStatus?: number;
  constructor(code: string, message: string, httpStatus?: number) {
    super(`[${code}] ${message}`);
    this.name = "WahaError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function apiRoot(value: string) {
  let base: URL;
  try { base = new URL(value.trim()); } catch { throw new Error("Alamat API harus berupa URL HTTPS yang valid."); }
  const isLocal = base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname);
  if ((base.protocol !== "https:" && !isLocal) || base.username || base.password || base.search || base.hash) throw new Error("Alamat API harus HTTPS tanpa kredensial, query, atau fragmen.");
  return base.href.replace(/\/+$/, "");
}

// Bound provider responses and never include their raw body, URL or credentials in errors.
async function responseText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "", size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new WahaError("WAHA_RESPONSE", "Respons penyedia tidak valid: ukuran respons terlalu besar.");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

async function wahaRequest(root: string, key: string, path: string, transport: typeof fetch, body?: object): Promise<Record<string, unknown> | null> {
  const sending = body !== undefined;
  const stage = sending ? "pengiriman pesan" : "verifikasi identitas bot";
  const uncertain = sending ? " Periksa riwayat WAHA sebelum mengirim ulang; pesan mungkin telah diterima." : " Pesan belum dikirim.";
  let response: Response, text: string;
  try {
    response = await transport(root + path, {
      method: sending ? "POST" : "GET",
      headers: { "X-Api-Key": key, "Accept": "application/json", "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      redirect: "manual", signal: AbortSignal.timeout(sending ? 15000 : 10000),
      ...(sending ? { body: JSON.stringify(body) } : {}),
    });
    text = await responseText(response);
  } catch (error) {
    if (error instanceof WahaError) throw new WahaError(error.code, `Respons penyedia tidak valid saat ${stage}.${uncertain}`);
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new WahaError(timeout ? "WAHA_TIMEOUT" : "WAHA_NETWORK", `${timeout ? "Waktu tunggu habis" : "Koneksi gagal"} saat ${stage}. Periksa jaringan, TLS, tunnel, dan ketersediaan server.${uncertain}`);
  }
  const status = response.status;
  const context = `Saat ${stage} (HTTP ${status}).`;
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = undefined; }
  const json = data !== null && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
  const html = /text\/html/i.test(response.headers.get("content-type") || "") || /^\s*(?:<!doctype html|<html)/i.test(text);
  const tunnel = /ERR_NGROK_\d+|ngrok.*(?:offline|tunnel|gateway)|cloudflare.*(?:tunnel|error)|error\s*1033/i.test(text);
  if ((status >= 300 && status < 400) || html || tunnel) {
    throw new WahaError("WAHA_TUNNEL", `${context} Respons berasal dari halaman perantara/redirect, bukan API WAHA yang terverifikasi. Periksa URL, tunnel, dan akses reverse proxy.${uncertain}`, status);
  }
  if (status === 401 || status === 403) throw new WahaError("WAHA_AUTH", `${context} Akses API ditolak. Periksa API key dan izin membaca sesi serta mengirim pesan. Jika memakai proxy autentikasi, periksa izinnya juga.${uncertain}`, status);
  if (status === 404 || status === 405) throw new WahaError("WAHA_ENDPOINT", `${context} Endpoint atau sesi tidak ditemukan/tidak didukung. Periksa URL dasar, nama sesi, dan versi WAHA.${uncertain}`, status);
  if (status === 409 || status === 422) throw new WahaError("WAHA_SESSION", `${context} Sesi atau permintaan ditolak. Periksa status sesi WORKING dan koneksi WhatsApp.${uncertain}`, status);
  if ([502, 504, 520, 521, 522, 523, 524, 525, 526, 530].includes(status)) throw new WahaError("WAHA_GATEWAY", `${context} Gateway tidak berhasil menjangkau layanan. Periksa tunnel/reverse proxy dan server WAHA; kode ini belum memastikan komponen yang gagal.${uncertain}`, status);
  if (status >= 500) throw new WahaError("WAHA_SERVER", `${context} Layanan API mengalami gangguan. Periksa log server WAHA dan reverse proxy.${uncertain}`, status);
  if (status === 429) throw new WahaError("WAHA_RATE_LIMIT", `${context} Batas permintaan penyedia tercapai. Tunggu sebelum mencoba lagi.${uncertain}`, status);
  if (!response.ok) throw new WahaError("WAHA_REQUEST", `${context} Permintaan ditolak penyedia.${uncertain}`, status);
  if (data === null) return null;
  if (!json) throw new WahaError("WAHA_RESPONSE", `Respons penyedia tidak valid saat ${stage} (HTTP ${status}). Periksa alamat API dan kompatibilitas WAHA.${uncertain}`, status);
  return json;
}

export async function verifyWahaSession(env: WhatsAppEnvironment, transport: typeof fetch = fetch) {
  if (!env.WAHA_API_URL?.trim() || !env.WAHA_API_KEY?.trim()) throw new Error("Konfigurasi penyedia WhatsApp belum lengkap.");
  // Accept both a server base and a base ending in /api without duplicating /api.
  const root = apiRoot(env.WAHA_API_URL).replace(/\/api$/, "");
  const session = env.WAHA_SESSION?.trim() || "default";
  const path = `/api/sessions/${encodeURIComponent(session)}`;
  let me: Record<string, unknown> | null;
  try {
    me = await wahaRequest(root, env.WAHA_API_KEY, path + "/me", transport);
  } catch (error) {
    // Compatibility fallback only for missing/unsupported /me; never bypass auth,
    // network or server errors. Session metadata must positively verify identity.
    if (!(error instanceof WahaError) || error.code !== "WAHA_ENDPOINT") throw error;
    const info = await wahaRequest(root, env.WAHA_API_KEY, path, transport);
    if (info?.name !== session || info.status !== "WORKING") throw new WahaError("WAHA_SESSION", "Sesi WAHA belum terverifikasi sebagai WORKING. Periksa nama sesi dan pemasangan WhatsApp. Pesan belum dikirim.");
    me = info.me && typeof info.me === "object" ? info.me as Record<string, unknown> : null;
  }
  // @lid is not a phone number and cannot safely enforce the self-send guard.
  const match = typeof me?.id === "string" ? /^([1-9]\d{7,14})(?::\d+)?@(c\.us|s\.whatsapp\.net)$/.exec(me.id) : null;
  if (!match) throw new WahaError("WAHA_SESSION", "Sesi WAHA belum terhubung ke nomor bot yang valid. Periksa sesi dan QR WhatsApp. Pesan belum dikirim.");
  return { sender: match[1], session, root };
}

export async function deliverWhatsApp(env: WhatsAppEnvironment, recipient: string, message: string, transport: typeof fetch = fetch) {
  const { provider, whatsappConfigured } = whatsappConfiguration(env);
  if (!whatsappConfigured) throw new Error("Konfigurasi penyedia WhatsApp belum lengkap.");
  const phone = recipient.replace(/\D/g, "").replace(/^0/, "62");
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error("Nomor tujuan WhatsApp tidak valid.");
  if (provider === "waha") {
    const { sender, session, root } = await verifyWahaSession(env, transport);
    if (sender === phone) throw new Error("Nomor penerima sama dengan nomor bot. Isi nomor pribadi admin pada menu Pengguna.");
    const result = await wahaRequest(root, env.WAHA_API_KEY!, "/api/sendText", transport, { session, chatId: `${phone}@c.us`, text: message });
    const messageId = result?.id;
    const id = typeof messageId === "string" ? messageId : messageId && typeof messageId === "object" && "_serialized" in messageId ? messageId._serialized : undefined;
    if (typeof id !== "string" || !id.trim()) throw new WahaError("WAHA_RESPONSE", "Penyedia belum mengonfirmasi ID pesan. Periksa riwayat sebelum mengirim ulang.");
    return { id, status: "ACCEPTED" as const };
  }
  const root = apiRoot(env.WHATSAPP_API_URL || "https://graph.facebook.com/v21.0");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  headers.Authorization = `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`;
  const response = await transport(`${root}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`, {
    method: "POST", headers, redirect: "manual", signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { preview_url: false, body: message } }),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403
    ? "Akses penyedia ditolak. Periksa API key."
    : response.status === 422 ? "Sesi atau pesan ditolak penyedia. Periksa koneksi WhatsApp."
    : `Penyedia WhatsApp merespons HTTP ${response.status}.`);
  let result: { id?: string | { _serialized?: string }; messages?: { id?: string }[] };
  try { result = await response.json(); } catch { throw new Error("Respons penyedia tidak valid. Periksa riwayat sebelum mengirim ulang."); }
  const id = result?.messages?.[0]?.id;
  if (typeof id !== "string" || !id.trim()) throw new Error("Penyedia belum mengonfirmasi ID pesan. Periksa riwayat sebelum mengirim ulang.");
  return { id, status: "ACCEPTED" as const };
}
