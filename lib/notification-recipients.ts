export type NotificationAdmin = { role: string; departmentId: string | null; whatsappNumber: string | null; isActive: boolean };
export function notificationPhone(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!/^[+\d\s()-]+$/.test(raw)) return null;
  const phone = raw.replace(/\D/g, "").replace(/^0/, "62");
  return /^[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
export function notificationRecipients(admins: NotificationAdmin[], departmentId: string) {
  return [...new Set(admins.filter(user => user.isActive && (user.role === "SUPER_ADMIN" || (user.role === "ADMIN_BIDANG" && user.departmentId === departmentId)))
    .map(user => notificationPhone(user.whatsappNumber)).filter((phone): phone is string => Boolean(phone)))];
}
