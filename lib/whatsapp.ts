import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { whatsappNotificationLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type WhatsAppInput = { logId: string; recipient: string | null; message: string };

export async function sendWhatsAppNotification(input: WhatsAppInput) {
  const db = getDb();
  const runtimeEnv = env as typeof env & {
    WHATSAPP_API_URL?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
  };
  const apiUrl = runtimeEnv.WHATSAPP_API_URL?.trim() || "https://graph.facebook.com/v21.0";
  const accessToken = runtimeEnv.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = runtimeEnv.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId || !input.recipient) {
    await db.update(whatsappNotificationLogs).set({
      status: "NOT_CONFIGURED",
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      errorMessage: !input.recipient
        ? "Nomor WhatsApp penerima belum tersedia."
        : "WhatsApp Business API belum diaktifkan. Notifikasi aplikasi tetap tersedia.",
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
    return;
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.recipient.replace(/\D/g, "").replace(/^0/, "62"),
        type: "text",
        text: { preview_url: false, body: input.message },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Provider merespons ${response.status}`);
    const result = (await response.json()) as { messages?: { id?: string }[] };
    await db.update(whatsappNotificationLogs).set({
      status: "SENT",
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      sentAt: new Date().toISOString(),
      providerMessageId: result.messages?.[0]?.id ?? null,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
  } catch (error) {
    await db.update(whatsappNotificationLogs).set({
      status: "FAILED",
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      errorMessage: error instanceof Error ? error.message : "Pengiriman gagal",
      nextRetryAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
  }
}

export async function dispatchQueuedNotification(logId: string) {
  const [entry] = await getDb().select().from(whatsappNotificationLogs).where(eq(whatsappNotificationLogs.id, logId)).limit(1);
  if (entry && entry.status === "QUEUED") await sendWhatsAppNotification({logId, recipient: entry.recipient, message: entry.message});
}
