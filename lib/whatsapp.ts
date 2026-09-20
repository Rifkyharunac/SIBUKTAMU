import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { whatsappNotificationLogs } from "@/db/schema";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { deliverWhatsApp, whatsappConfiguration, type WhatsAppEnvironment } from "@/lib/whatsapp-provider";

type WhatsAppInput = { logId: string; recipient: string | null; message: string };

export async function sendWhatsAppNotification(input: WhatsAppInput) {
  const db = getDb();
  const [claimed] = await db.update(whatsappNotificationLogs).set({ status: "SENDING", updatedAt: new Date().toISOString() })
    .where(and(eq(whatsappNotificationLogs.id, input.logId), inArray(whatsappNotificationLogs.status, ["QUEUED", "FAILED", "NOT_CONFIGURED"]), lt(whatsappNotificationLogs.attempts, 5))).returning({ id: whatsappNotificationLogs.id });
  if (!claimed) return;
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
    console.error("sendWhatsAppNotification failed:", error);
    const detail = error instanceof Error ? `${error.message}` : String(error);
    await db.update(whatsappNotificationLogs).set({
      status: "FAILED",
      attempts: sql`${whatsappNotificationLogs.attempts} + 1`,
      errorMessage: detail || "Koneksi penyedia terputus atau waktu tunggu habis. Periksa riwayat sebelum mengirim ulang.",
      nextRetryAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(whatsappNotificationLogs.id, input.logId));
  }
}

export async function dispatchQueuedNotification(logId: string) {
  const [entry] = await getDb().select().from(whatsappNotificationLogs).where(eq(whatsappNotificationLogs.id, logId)).limit(1);
  if (entry && entry.status === "QUEUED") await sendWhatsAppNotification({logId, recipient: entry.recipient, message: entry.message});
}

export async function dispatchVisitNotifications(visitId: string) {
  const entries = await getDb().select({ id: whatsappNotificationLogs.id }).from(whatsappNotificationLogs)
    .where(and(eq(whatsappNotificationLogs.visitId, visitId), eq(whatsappNotificationLogs.status, "QUEUED")));
  for (let i = 0; i < entries.length; i += 3) {
    await Promise.allSettled(entries.slice(i, i + 3).map(entry => dispatchQueuedNotification(entry.id)));
  }
}
