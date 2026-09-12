import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { whatsappNotificationLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

import { deliverWhatsApp, whatsappConfiguration, type WhatsAppEnvironment } from "@/lib/whatsapp-provider";

type WhatsAppInput = { logId: string; recipient: string | null; message: string };

export async function sendWhatsAppNotification(input: WhatsAppInput) {
  const db = getDb();
  const runtimeEnv = env as typeof env & WhatsAppEnvironment;
  if (!whatsappConfiguration(runtimeEnv).whatsappConfigured || !input.recipient) {
    await db.update(whatsappNotificationLogs).set({
      status: "NOT_CONFIGURED",
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      errorMessage: !input.recipient
        ? "Nomor WhatsApp penerima belum tersedia."
        : "Penyedia WhatsApp belum dikonfigurasi. Notifikasi aplikasi tetap tersedia.",
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
    return;
  }

  try {
    const result = await deliverWhatsApp(runtimeEnv, input.recipient, input.message);
    await db.update(whatsappNotificationLogs).set({
      status: result.status,
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      sentAt: null,
      nextRetryAt: null,
      providerMessageId: result.id,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
  } catch (error) {
    await db.update(whatsappNotificationLogs).set({
      status: "FAILED",
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      errorMessage: error instanceof Error && !["TypeError", "TimeoutError", "AbortError"].includes(error.name) ? error.message : "Koneksi penyedia terputus atau waktu tunggu habis. Periksa riwayat sebelum mengirim ulang.",
      nextRetryAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
  }
}

export async function dispatchQueuedNotification(logId: string) {
  const [entry] = await getDb().select().from(whatsappNotificationLogs).where(eq(whatsappNotificationLogs.id, logId)).limit(1);
  if (entry && entry.status === "QUEUED") await sendWhatsAppNotification({logId, recipient: entry.recipient, message: entry.message});
}
