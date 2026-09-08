import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const securityRateLimits = sqliteTable("security_rate_limits", {
  id: text("id").primaryKey(),
  hits: integer("hits").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("security_rate_expiry_idx").on(table.expiresAt)]);

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  whatsappNumber: text("whatsapp_number"),
  email: text("email"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const services = sqliteTable(
  "services",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull().default(""),
    whatsappNumber: text("whatsapp_number"),
    requiresPurpose: integer("requires_purpose", { mode: "boolean" })
      .notNull()
      .default(false),
    allowsEmployee: integer("allows_employee", { mode: "boolean" })
      .notNull()
      .default(true),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("services_department_idx").on(table.departmentId),
    uniqueIndex("services_name_unique").on(table.name),
  ],
);

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    name: text("name").notNull(),
    position: text("position").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("employees_department_idx").on(table.departmentId)],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id),
    departmentId: text("department_id").references(() => departments.id),
    whatsappNumber: text("whatsapp_number"),
    isBackupAdmin: integer("is_backup_admin", { mode: "boolean" })
      .notNull()
      .default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastSeenAt: text("last_seen_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("users_department_idx").on(table.departmentId)],
);

export const adminCredentials = sqliteTable(
  "admin_credentials",
  {
    userId: text("user_id").primaryKey().references(() => users.id),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
    passwordUpdatedAt: text("password_updated_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("admin_credentials_username_unique").on(table.username)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("admin_sessions_user_idx").on(table.userId),
    index("admin_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const adminLoginAttempts = sqliteTable(
  "admin_login_attempts",
  {
    id: text("id").primaryKey(),
    usernameHash: text("username_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    successful: integer("successful", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("admin_login_attempts_lookup_idx").on(table.usernameHash, table.ipHash, table.createdAt)],
);

export const visits = sqliteTable(
  "visits",
  {
    id: text("id").primaryKey(),
    visitCode: text("visit_code").notNull().unique(),
    queueNumber: integer("queue_number").notNull(),
    visitorName: text("visitor_name").notNull(),
    visitorType: text("visitor_type").notNull(),
    institutionName: text("institution_name"),
    phone: text("phone").notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    employeeId: text("employee_id").references(() => employees.id),
    employeeName: text("employee_name"),
    purpose: text("purpose"),
    signaturePath: text("signature_path").notNull(),
    checkoutTokenHash: text("checkout_token_hash"),
    visitDate: text("visit_date").notNull(),
    checkInAt: text("check_in_at").notNull(),
    checkOutAt: text("check_out_at"),
    durationMinutes: integer("duration_minutes"),
    status: text("status").notNull().default("BARU"),
    source: text("source").notNull().default("QR_TAMU"),
    consentAt: text("consent_at").notNull(),
    handledBy: text("handled_by").references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("visits_daily_queue_unique").on(table.visitDate, table.queueNumber),
    index("visits_department_date_idx").on(table.departmentId, table.visitDate),
    index("visits_phone_idx").on(table.phone),
    index("visits_status_idx").on(table.status),
  ],
);

export const visitStatusLogs = sqliteTable("visit_status_logs", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull().references(() => visits.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  userId: text("user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const visitTransfers = sqliteTable("visit_transfers", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull().references(() => visits.id),
  fromDepartmentId: text("from_department_id").notNull().references(() => departments.id),
  toDepartmentId: text("to_department_id").notNull().references(() => departments.id),
  transferredBy: text("transferred_by").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const whatsappNotificationLogs = sqliteTable(
  "whatsapp_notification_logs",
  {
    id: text("id").primaryKey(),
    visitId: text("visit_id").notNull().references(() => visits.id),
    recipient: text("recipient"),
    message: text("message").notNull(),
    status: text("status").notNull().default("QUEUED"),
    attempts: integer("attempts").notNull().default(0),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    readAt: text("read_at"),
    archivedAt: text("archived_at"),
    errorMessage: text("error_message"),
    providerMessageId: text("provider_message_id"),
    nextRetryAt: text("next_retry_at"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("whatsapp_status_idx").on(table.status),
    index("whatsapp_read_archived_idx").on(table.isRead, table.archivedAt),
  ],
);

export const serviceSurveys = sqliteTable("service_surveys", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull().references(() => visits.id).unique(),
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    ipAddress: text("ip_address"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("audit_created_idx").on(table.createdAt)],
);

export const submissionAttempts = sqliteTable(
  "submission_attempts",
  {
    id: text("id").primaryKey(),
    ipHash: text("ip_hash").notNull(),
    phoneHash: text("phone_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("submission_ip_idx").on(table.ipHash, table.createdAt),
    index("submission_phone_idx").on(table.phoneHash, table.createdAt),
  ],
);
