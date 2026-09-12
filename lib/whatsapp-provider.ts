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

export async function deliverWhatsApp(env: WhatsAppEnvironment, recipient: string, message: string, transport: typeof fetch = fetch) {
  const { provider, whatsappConfigured } = whatsappConfiguration(env);
  if (!whatsappConfigured) throw new Error("Konfigurasi penyedia WhatsApp belum lengkap.");
  const phone = recipient.replace(/\D/g, "").replace(/^0/, "62");
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error("Nomor tujuan WhatsApp tidak valid.");
  const base = new URL(provider === "waha" ? env.WAHA_API_URL! : env.WHATSAPP_API_URL || "https://graph.facebook.com/v21.0");
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Alamat API harus HTTPS tanpa kredensial, query, atau fragmen.");
  const root = base.href.replace(/\/$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "waha") headers["X-Api-Key"] = env.WAHA_API_KEY!;
  else headers.Authorization = `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`;
  const response = await transport(provider === "waha" ? `${root}/api/sendText` : `${root}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`, {
    method: "POST", headers, redirect: "error", signal: AbortSignal.timeout(15000),
    body: JSON.stringify(provider === "waha"
      ? { session: env.WAHA_SESSION?.trim() || "default", chatId: `${phone}@c.us`, text: message }
      : { messaging_product: "whatsapp", to: phone, type: "text", text: { preview_url: false, body: message } }),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403
    ? "Akses penyedia ditolak. Periksa API key."
    : response.status === 422 ? "Sesi atau pesan ditolak penyedia. Periksa koneksi WhatsApp."
    : `Penyedia WhatsApp merespons HTTP ${response.status}.`);
  let result: { id?: string | { _serialized?: string }; messages?: { id?: string }[] };
  try { result = await response.json(); } catch { throw new Error("Respons penyedia tidak valid. Periksa riwayat sebelum mengirim ulang."); }
  const id = provider === "waha" ? (typeof result?.id === "string" ? result.id : result?.id?._serialized) : result?.messages?.[0]?.id;
  if (typeof id !== "string" || !id.trim()) throw new Error("Penyedia belum mengonfirmasi ID pesan. Periksa riwayat sebelum mengirim ulang.");
  return { id, status: "ACCEPTED" as const };
}
