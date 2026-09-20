import { and, asc, count, desc, eq, gte, inArray, like, or, sql } from "drizzle-orm";
import { whatsappConfiguration, type WhatsAppEnvironment } from "@/lib/whatsapp-provider";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { ensureSeedData } from "@/db/seed";
import {
  auditLogs,
  adminCredentials,
  departments,
  employees,
  roles,
  services,
  settings,
  users,
  visits,
  whatsappNotificationLogs,
} from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { witaParts } from "@/lib/time";

export const dynamic = "force-dynamic";

const OFFICIAL_DEPARTMENT_IDS = ["dept-p4tk", "dept-hiwas", "dept-pkt", "dept-pembangunan", "dept-pengembangan", "dept-upt-wasnaker-1", "dept-upt-wasnaker-2", "dept-sekretariat","dept-penerima-tamu"];

function maskedPhone(value: string) {
  return value.length > 8 ? `${value.slice(0, 4)}****${value.slice(-4)}` : "********";
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  await ensureSeedData();
  const db = getDb();
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const requestedDepartment = url.searchParams.get("department")?.trim() ?? "";
  const time = witaParts();
  const monthPrefix = time.dateKey.slice(0, 7);
  const departmentFilter = auth.identity.role === "ADMIN_BIDANG"
    ? auth.identity.departmentId
    : requestedDepartment || null;

  const conditions = [];
  if (departmentFilter) conditions.push(eq(visits.departmentId, departmentFilter));
  else conditions.push(inArray(visits.departmentId, OFFICIAL_DEPARTMENT_IDS));
  if (status) conditions.push(eq(visits.status, status));
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(
      like(visits.visitorName, term),
      ...(auth.identity.role === "VIEWER" ? [] : [like(visits.phone, term)]),
      like(visits.institutionName, term),
      like(visits.visitCode, term),
      like(visits.purpose, term),
    )!);
  }

  const visitRows = await db.select({
    id: visits.id,
    visitCode: visits.visitCode,
    queueNumber: visits.queueNumber,
    visitorName: visits.visitorName,
    visitorType: visits.visitorType,
    institutionName: visits.institutionName,
    phone: visits.phone,
    purpose: visits.purpose,
    employeeName: visits.employeeName,
    status: visits.status,
    source: visits.source,
    checkInAt: visits.checkInAt,
    checkOutAt: visits.checkOutAt,
    durationMinutes: visits.durationMinutes,
    departmentId: visits.departmentId,
    departmentName: departments.name,
    serviceId: visits.serviceId,
    serviceName: services.name,
    signaturePath: visits.signaturePath,
  }).from(visits)
    .innerJoin(departments, eq(visits.departmentId, departments.id))
    .innerJoin(services, eq(visits.serviceId, services.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(visits.checkInAt)).limit(200);

  const scopeCondition = departmentFilter
    ? eq(visits.departmentId, departmentFilter)
    : inArray(visits.departmentId, OFFICIAL_DEPARTMENT_IDS);
  const weekStart = witaParts(new Date(Date.now()-6*86400000)).dateKey;
  const [summaryRows, daily, byService, byType] = await Promise.all([
    db.select({
      today: sql<number>`SUM(CASE WHEN ${visits.visitDate} = ${time.dateKey} THEN 1 ELSE 0 END)`,
      month: sql<number>`SUM(CASE WHEN ${visits.visitDate} LIKE ${monthPrefix+'%'} THEN 1 ELSE 0 END)`,
      active: sql<number>`SUM(CASE WHEN ${visits.checkOutAt} IS NULL AND ${visits.status} != 'BATAL' THEN 1 ELSE 0 END)`,
      waiting: sql<number>`SUM(CASE WHEN ${visits.status} IN ('BARU','MENUNGGU','DITERIMA') THEN 1 ELSE 0 END)`,
      serving: sql<number>`SUM(CASE WHEN ${visits.status} = 'SEDANG_DILAYANI' THEN 1 ELSE 0 END)`,
      completed: sql<number>`SUM(CASE WHEN ${visits.status} = 'SELESAI' AND ${visits.visitDate} = ${time.dateKey} THEN 1 ELSE 0 END)`,
      averageDuration: sql<number>`AVG(CASE WHEN ${visits.visitDate} LIKE ${monthPrefix+'%'} THEN ${visits.durationMinutes} ELSE NULL END)`,
    }).from(visits).where(scopeCondition),
    db.select({date:visits.visitDate,count:count()}).from(visits).where(and(scopeCondition,gte(visits.visitDate,weekStart))).groupBy(visits.visitDate),
    db.select({name:services.name,count:count()}).from(visits).innerJoin(services,eq(visits.serviceId,services.id)).where(and(scopeCondition,like(visits.visitDate,monthPrefix+'%'))).groupBy(services.id,services.name).orderBy(desc(count())).limit(5),
    db.select({name:visits.visitorType,count:count()}).from(visits).where(and(scopeCondition,like(visits.visitDate,monthPrefix+'%'))).groupBy(visits.visitorType).orderBy(desc(count())).limit(4),
  ]);
  const [departmentRows, serviceRows, employeeRows, userRows, notificationRows, auditRows, settingRows] = await Promise.all([
    db.select().from(departments).orderBy(asc(departments.displayOrder)),
    db.select({
      id: services.id, name: services.name, category: services.category, description: services.description,
      departmentId: services.departmentId, departmentName: departments.name, whatsappNumber: services.whatsappNumber,
      requiresPurpose: services.requiresPurpose, allowsEmployee: services.allowsEmployee,
      displayOrder: services.displayOrder, isActive: services.isActive,
    }).from(services).innerJoin(departments, eq(services.departmentId, departments.id)).orderBy(asc(services.displayOrder)),
    db.select({
      id: employees.id, name: employees.name, position: employees.position, departmentId: employees.departmentId,
      departmentName: departments.name, isActive: employees.isActive,
    }).from(employees).innerJoin(departments, eq(employees.departmentId, departments.id)).orderBy(asc(employees.name)),
    db.select({
      id: users.id, name: users.name, email: users.email, roleId: users.roleId, role: roles.label,
      roleName: roles.name, departmentId: users.departmentId, whatsappNumber: users.whatsappNumber,
      isActive: users.isActive, lastSeenAt: users.lastSeenAt, username: adminCredentials.username,
      mustChangePassword: adminCredentials.mustChangePassword,
    }).from(users).innerJoin(roles, eq(users.roleId, roles.id)).leftJoin(adminCredentials, eq(adminCredentials.userId, users.id)).orderBy(asc(users.name)),
    db.select({
      id: whatsappNotificationLogs.id,
      visitId: whatsappNotificationLogs.visitId,
      recipient: whatsappNotificationLogs.recipient,
      message: whatsappNotificationLogs.message,
      status: whatsappNotificationLogs.status,
      attempts: whatsappNotificationLogs.attempts,
      isRead: whatsappNotificationLogs.isRead,
      readAt: whatsappNotificationLogs.readAt,
      archivedAt: whatsappNotificationLogs.archivedAt,
      errorMessage: whatsappNotificationLogs.errorMessage,
      createdAt: whatsappNotificationLogs.createdAt,
      visitCode: visits.visitCode,
      visitorName: visits.visitorName,
      serviceName: services.name,
      departmentId: visits.departmentId,
    }).from(whatsappNotificationLogs)
      .innerJoin(visits, eq(whatsappNotificationLogs.visitId, visits.id))
      .innerJoin(services, eq(visits.serviceId, services.id))
      .where(scopeCondition)
      .orderBy(desc(whatsappNotificationLogs.createdAt)).limit(100),
    db.select({
      id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId,
      oldValue: auditLogs.oldValue, newValue: auditLogs.newValue, ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt, userName: users.name,
    }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(100),
    db.select({ key: settings.key, value: settings.value }).from(settings).orderBy(asc(settings.key)),
  ]);

  const [unread] = auth.identity.role === "VIEWER" ? [{value:0}] : await db.select({value:count()}).from(whatsappNotificationLogs).innerJoin(visits,eq(whatsappNotificationLogs.visitId,visits.id)).where(and(scopeCondition,eq(whatsappNotificationLogs.isRead,false),sql`${whatsappNotificationLogs.archivedAt} IS NULL`));
  const safeVisits = auth.identity.role === "VIEWER"
    ? visitRows.map((visit) => ({ ...visit, phone: maskedPhone(visit.phone), signaturePath: null }))
    : visitRows;
  return Response.json({
    identity: auth.identity,
    serverTime: time,
    stats: Object.fromEntries(Object.entries(summaryRows[0] || {}).map(([key,value])=>[key,Math.round(Number(value || 0))])),
    analytics: {daily,byService,byType},
    visits: safeVisits,
    departments: auth.identity.role === "SUPER_ADMIN" ? departmentRows : departmentRows.map(row => ({...row,whatsappNumber:null,email:null})),
    services: auth.identity.role === "SUPER_ADMIN" ? serviceRows : serviceRows.map(row => ({...row,whatsappNumber:null})),
    employees: employeeRows,
    users: auth.identity.role === "SUPER_ADMIN" ? userRows : [],
    notifications: auth.identity.role === "VIEWER" ? [] : notificationRows,
    unreadNotifications: unread?.value || 0,
    notificationConfig: whatsappConfiguration(env as typeof env & WhatsAppEnvironment),
    auditLogs: auth.identity.role === "SUPER_ADMIN" ? auditRows : [],
    settings: auth.identity.role === "SUPER_ADMIN" ? settingRows : [],
  });
}
