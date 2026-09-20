import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  adminCredentials,
  adminSessions,
  departments,
  employees,
  services,
  settings,
  users,
  visitStatusLogs,
  visitTransfers,
  visits,
  whatsappNotificationLogs,
} from "@/db/schema";
import { requireAdminApi, writeAudit } from "@/lib/admin-auth";
import { hashPassword, validatePassword } from "@/lib/password";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { canTransition, isVisitStatus } from "@/lib/visit-rules";

export async function POST(request: Request) {
  const auth = await requireAdminApi(["SUPER_ADMIN", "FRONT_OFFICE", "ADMIN_BIDANG"]);
  if ("error" in auth) return auth.error;
  const identity = auth.identity;
  const db = getDb();
  const payload = (await request.json()) as Record<string, unknown>;
  const action = String(payload.action ?? "");
  const ipAddress = request.headers.get("cf-connecting-ip");

  const notificationScope = and(
    isNull(whatsappNotificationLogs.archivedAt),
    identity.role === "ADMIN_BIDANG" ? inArray(whatsappNotificationLogs.visitId,db.select({id:visits.id}).from(visits).where(eq(visits.departmentId,identity.departmentId!))) : undefined,
  );

  async function requireNotificationAccess(id: string) {
    const [item] = await db.select({ id: whatsappNotificationLogs.id, departmentId: visits.departmentId })
      .from(whatsappNotificationLogs)
      .innerJoin(visits, eq(whatsappNotificationLogs.visitId, visits.id))
      .where(eq(whatsappNotificationLogs.id, id)).limit(1);
    if (!item) return { error: Response.json({ error: "Notifikasi tidak ditemukan." }, { status: 404 }) };
    if (identity.role === "ADMIN_BIDANG" && item.departmentId !== identity.departmentId) {
      return { error: Response.json({ error: "Notifikasi bukan milik bidang Anda." }, { status: 403 }) };
    }
    return { item };
  }

  try {
    if (action === "UPDATE_VISIT_STATUS") {
      const visitId = String(payload.visitId ?? "");
      const status = String(payload.status ?? "");
      if (!isVisitStatus(status)) return Response.json({ error: "Status tidak valid." }, { status: 422 });
      const [visit] = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
      if (!visit) return Response.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });
      if (identity.role === "ADMIN_BIDANG" && visit.departmentId !== identity.departmentId) {
        return Response.json({ error: "Kunjungan bukan milik bidang Anda." }, { status: 403 });
      }
      if (!canTransition(visit.status, status)) {
        return Response.json({ error: `Status ${visit.status.replaceAll("_", " ")} tidak dapat langsung diubah menjadi ${status.replaceAll("_", " ")}.` }, { status: 422 });
      }
      const now = new Date().toISOString();
      const completion = status === "SELESAI" && !visit.checkOutAt
        ? { checkOutAt: now, durationMinutes: Math.max(0, Math.round((Date.now() - new Date(visit.checkInAt).getTime()) / 60_000)) }
        : {};
      const changed = await db.update(visits).set({ status, handledBy: identity.id, updatedAt: now, ...completion }).where(and(eq(visits.id, visitId),eq(visits.status,visit.status))).returning({id:visits.id});
      if (!changed.length) return Response.json({error:"Status baru saja diperbarui. Muat ulang data."},{status:409});
      await db.insert(visitStatusLogs).values({
        id: crypto.randomUUID(), visitId, fromStatus: visit.status, toStatus: status, userId: identity.id,
      });
      await writeAudit({ userId: identity.id, action: "UPDATE_VISIT_STATUS", entity: "visits", entityId: visitId, oldValue: { status: visit.status }, newValue: { status }, ipAddress });
      return Response.json({ success: true });
    }

    if (action === "TRANSFER_VISIT") {
      const visitId = String(payload.visitId ?? "");
      const toDepartmentId = String(payload.departmentId ?? "");
      const reason = String(payload.reason ?? "").trim();
      if (!reason) return Response.json({ error: "Alasan pengalihan perlu diisi." }, { status: 422 });
      const [visit] = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
      const [target] = await db.select().from(departments).where(eq(departments.id, toDepartmentId)).limit(1);
      if (!visit || !target) return Response.json({ error: "Data pengalihan tidak ditemukan." }, { status: 404 });
      if (identity.role === "ADMIN_BIDANG" && visit.departmentId !== identity.departmentId) {
        return Response.json({ error: "Kunjungan bukan milik bidang Anda." }, { status: 403 });
      }
      if (visit.checkOutAt || visit.status === "BATAL" || !target.isActive) return Response.json({error:"Kunjungan atau bidang tujuan tidak dapat dialihkan."},{status:409});
      const changed = await db.update(visits).set({ departmentId: toDepartmentId, status: "DIALIHKAN", updatedAt: new Date().toISOString() }).where(and(eq(visits.id, visitId),eq(visits.status,visit.status),isNull(visits.checkOutAt))).returning({id:visits.id});
      if (!changed.length) return Response.json({error:"Status baru saja diperbarui. Muat ulang data."},{status:409});
      await db.insert(visitTransfers).values({
        id: crypto.randomUUID(), visitId, fromDepartmentId: visit.departmentId, toDepartmentId,
        transferredBy: identity.id, reason,
      });
      await db.insert(visitStatusLogs).values({
        id: crypto.randomUUID(), visitId, fromStatus: visit.status, toStatus: "DIALIHKAN", userId: identity.id, notes: reason,
      });
      await writeAudit({ userId: identity.id, action: "TRANSFER_VISIT", entity: "visits", entityId: visitId, oldValue: { departmentId: visit.departmentId }, newValue: { departmentId: toDepartmentId, reason }, ipAddress });
      return Response.json({ success: true });
    }

    if (action === "SAVE_DEPARTMENT") {
      if (identity.role !== "SUPER_ADMIN") return Response.json({ error: "Hanya Super Admin yang dapat mengubah bidang." }, { status: 403 });
      const id = String(payload.id || crypto.randomUUID());
      const values = {
        code: String(payload.code ?? "").trim().toUpperCase(), name: String(payload.name ?? "").trim(),
        description: String(payload.description ?? "").trim(), whatsappNumber: String(payload.whatsappNumber ?? "").trim() || null,
        email: String(payload.email ?? "").trim() || null, isActive: payload.isActive !== false, updatedAt: new Date().toISOString(),
      };
      if (!values.code || !values.name) return Response.json({ error: "Kode dan nama bidang wajib diisi." }, { status: 422 });
      await db.insert(departments).values({ id, ...values }).onConflictDoUpdate({ target: departments.id, set: values });
      await writeAudit({ userId: identity.id, action: "SAVE_DEPARTMENT", entity: "departments", entityId: id, newValue: values, ipAddress });
      return Response.json({ success: true, id });
    }

    if (action === "SAVE_SERVICE") {
      if (identity.role !== "SUPER_ADMIN") return Response.json({ error: "Hanya Super Admin yang dapat mengubah layanan." }, { status: 403 });
      const id = String(payload.id || crypto.randomUUID());
      const values = {
        name: String(payload.name ?? "").trim(), category: String(payload.category ?? "Umum").trim(),
        departmentId: String(payload.departmentId ?? ""), description: String(payload.description ?? "").trim(),
        whatsappNumber: String(payload.whatsappNumber ?? "").trim() || null, requiresPurpose: payload.requiresPurpose === true,
        allowsEmployee: payload.allowsEmployee !== false, isActive: payload.isActive !== false, updatedAt: new Date().toISOString(),
      };
      if (!values.name || !values.departmentId) return Response.json({ error: "Nama layanan dan bidang wajib diisi." }, { status: 422 });
      await db.insert(services).values({ id, ...values }).onConflictDoUpdate({ target: services.id, set: values });
      await writeAudit({ userId: identity.id, action: "SAVE_SERVICE", entity: "services", entityId: id, newValue: values, ipAddress });
      return Response.json({ success: true, id });
    }

    if (action === "SAVE_EMPLOYEE") {
      if (identity.role !== "SUPER_ADMIN") return Response.json({ error: "Hanya Super Admin yang dapat mengubah pegawai." }, { status: 403 });
      const id = String(payload.id || crypto.randomUUID());
      const values = {
        name: String(payload.name ?? "").trim(), position: String(payload.position ?? "").trim(),
        departmentId: String(payload.departmentId ?? ""), isActive: payload.isActive !== false,
      };
      if (!values.name || !values.departmentId) return Response.json({ error: "Nama dan bidang pegawai wajib diisi." }, { status: 422 });
      await db.insert(employees).values({ id, ...values }).onConflictDoUpdate({ target: employees.id, set: values });
      await writeAudit({ userId: identity.id, action: "SAVE_EMPLOYEE", entity: "employees", entityId: id, newValue: values, ipAddress });
      return Response.json({ success: true, id });
    }

    if (action === "SAVE_USER") {
      if (identity.role !== "SUPER_ADMIN") return Response.json({ error: "Hanya Super Admin yang dapat mengubah pengguna." }, { status: 403 });
      const id = String(payload.id || crypto.randomUUID());
      const isNew = !payload.id;
      const username = String(payload.username ?? "").trim().toLowerCase();
      const temporaryPassword = String(payload.temporaryPassword ?? "");
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) return Response.json({ error: "Username harus 3–40 karakter dan hanya memakai huruf kecil, angka, titik, garis bawah, atau tanda hubung." }, { status: 422 });
      const [usernameOwner] = await db.select({ userId: adminCredentials.userId }).from(adminCredentials).where(eq(adminCredentials.username, username)).limit(1);
      if (usernameOwner && usernameOwner.userId !== id) return Response.json({ error: "Username sudah digunakan petugas lain." }, { status: 409 });
      const [existingCredential] = await db.select().from(adminCredentials).where(eq(adminCredentials.userId, id)).limit(1);
      if ((isNew || !existingCredential) && !temporaryPassword) return Response.json({ error: "Sandi sementara wajib diisi untuk akun baru." }, { status: 422 });
      if (temporaryPassword) {
        const passwordError = validatePassword(temporaryPassword);
        if (passwordError) return Response.json({ error: `Sandi sementara: ${passwordError}` }, { status: 422 });
      }
      const values = {
        name: String(payload.name ?? "").trim(), email: String(payload.email ?? "").trim().toLowerCase(),
        roleId: String(payload.roleId ?? "role-viewer"), departmentId: String(payload.departmentId ?? "") || null,
        whatsappNumber: String(payload.whatsappNumber ?? "").trim() || null, isActive: payload.isActive !== false,
        updatedAt: new Date().toISOString(),
      };
      if (!["role-super","role-front","role-department","role-viewer"].includes(values.roleId)) return Response.json({error:"Peran tidak valid."},{status:422});
      if (id === identity.id && (!values.isActive || values.roleId !== "role-super" || temporaryPassword)) return Response.json({error:"Gunakan menu Ganti Sandi untuk akun sendiri. Akun sendiri harus tetap aktif sebagai Super Admin."},{status:422});
      if (values.roleId === "role-department" && !values.departmentId) return Response.json({error:"Admin Bidang wajib memiliki bidang tugas."},{status:422});
      if (!values.name || !values.email.includes("@")) return Response.json({ error: "Nama dan email pengguna wajib diisi." }, { status: 422 });
      await db.insert(users).values({ id, ...values }).onConflictDoUpdate({ target: users.id, set: values });
      const password = temporaryPassword ? await hashPassword(temporaryPassword) : null;
      if (existingCredential) {
        await db.update(adminCredentials).set({
          username,
          ...(password ? { passwordHash: password.hash, passwordSalt: password.salt, mustChangePassword: true, passwordUpdatedAt: new Date().toISOString() } : {}),
          updatedAt: new Date().toISOString(),
        }).where(eq(adminCredentials.userId, id));
      } else if (password) {
        await db.insert(adminCredentials).values({ userId: id, username, passwordHash: password.hash, passwordSalt: password.salt, mustChangePassword: true });
      }
      if (id !== identity.id) await db.delete(adminSessions).where(eq(adminSessions.userId,id));
      await writeAudit({ userId: identity.id, action: "SAVE_USER", entity: "users", entityId: id, newValue: { ...values, username, passwordReset: Boolean(password), whatsappNumber: values.whatsappNumber ? "configured" : null }, ipAddress });
      return Response.json({ success: true, id });
    }

    if (action === "SAVE_SETTING") {
      if (identity.role !== "SUPER_ADMIN") return Response.json({ error: "Hanya Super Admin yang dapat mengubah pengaturan." }, { status: 403 });
      const key = String(payload.key ?? "").trim();
      const value = String(payload.value ?? "").trim();
      if (value.length > 500 || !["office_name","office_address","office_hours","allow_outside_hours","data_retention","report_signer_title","report_signer_name","report_signer_nip"].includes(key)) return Response.json({ error: "Nama pengaturan diperlukan." }, { status: 422 });
      await db.insert(settings).values({ key, value, updatedBy: identity.id }).onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: identity.id, updatedAt: new Date().toISOString() } });
      await writeAudit({ userId: identity.id, action: "SAVE_SETTING", entity: "settings", entityId: key, newValue: { value }, ipAddress });
      return Response.json({ success: true });
    }

    if (action === "RETRY_WHATSAPP") {
      const id = String(payload.id ?? "");
      const access = await requireNotificationAccess(id);
      if ("error" in access) return access.error;
      const [log] = await db.select().from(whatsappNotificationLogs).where(eq(whatsappNotificationLogs.id, id)).limit(1);
      if (!log) return Response.json({ error: "Notifikasi tidak ditemukan." }, { status: 404 });
      if (["SENT", "ACCEPTED", "SENDING"].includes(log.status) || (log.status === "QUEUED" && Date.now()-new Date(log.createdAt).getTime()<60000) || log.attempts >= 5) return Response.json({error:"Pesan sudah dikirim, sedang diproses, atau mencapai batas percobaan."},{status:409});
      await sendWhatsAppNotification({ logId: log.id, recipient: log.recipient, message: log.message });
      await writeAudit({ userId: identity.id, action: "RETRY_WHATSAPP", entity: "whatsapp_notification_logs", entityId: id, ipAddress });
      return Response.json({ success: true });
    }

    if (action === "MARK_NOTIFICATION_READ") {
      const id = String(payload.id ?? "");
      const access = await requireNotificationAccess(id);
      if ("error" in access) return access.error;
      const isRead = payload.isRead !== false;
      const now = new Date().toISOString();
      await db.update(whatsappNotificationLogs).set({ isRead, readAt: isRead ? now : null, updatedAt: now }).where(eq(whatsappNotificationLogs.id, id));
      return Response.json({ success: true });
    }

    if (action === "MARK_ALL_NOTIFICATIONS_READ") {
      const now=new Date().toISOString();
      await db.update(whatsappNotificationLogs).set({isRead:true,readAt:now,updatedAt:now}).where(notificationScope);
      return Response.json({success:true});
    }

    if (action === "ARCHIVE_NOTIFICATION") {
      const id = String(payload.id ?? "");
      const access = await requireNotificationAccess(id);
      if ("error" in access) return access.error;
      const archived = payload.archived !== false;
      const now = new Date().toISOString();
      await db.update(whatsappNotificationLogs).set({
        archivedAt: archived ? now : null,
        isRead: archived ? true : undefined,
        readAt: archived ? now : undefined,
        updatedAt: now,
      }).where(eq(whatsappNotificationLogs.id, id));
      await writeAudit({ userId: identity.id, action: archived ? "ARCHIVE_NOTIFICATION" : "RESTORE_NOTIFICATION", entity: "whatsapp_notification_logs", entityId: id, ipAddress });
      return Response.json({ success: true });
    }

    if (action === "DELETE_NOTIFICATION") {
      const id = String(payload.id ?? "");
      const access = await requireNotificationAccess(id);
      if ("error" in access) return access.error;
      await db.delete(whatsappNotificationLogs).where(eq(whatsappNotificationLogs.id, id));
      await writeAudit({ userId: identity.id, action: "DELETE_NOTIFICATION", entity: "whatsapp_notification_logs", entityId: id, ipAddress });
      return Response.json({ success: true });
    }

    if (action === "DELETE_READ_NOTIFICATIONS") {
      await db.delete(whatsappNotificationLogs).where(and(notificationScope,eq(whatsappNotificationLogs.isRead,true),isNotNull(whatsappNotificationLogs.readAt)));
      await writeAudit({ userId: identity.id, action: "DELETE_READ_NOTIFICATIONS", entity: "whatsapp_notification_logs", ipAddress });
      return Response.json({success:true});
    }

    return Response.json({ error: "Tindakan tidak dikenal." }, { status: 400 });
  } catch (error) {
    console.error("admin_action_failed", error);
    return Response.json({ error: "Perubahan belum dapat disimpan. Silakan periksa data dan coba kembali." }, { status: 500 });
  }
}
