import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminIdentity } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function safeReturnTo(value?: string) {
  if (!value?.startsWith("/admin/") || value.startsWith("//") || value.startsWith("/admin/login")) return "/admin/dashboard";
  return value;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const identity = await getAdminIdentity();
  if (identity) redirect(identity.mustChangePassword ? "/admin/password" : "/admin/dashboard");
  const { returnTo } = await searchParams;
  return <AdminLoginForm returnTo={safeReturnTo(returnTo)} />;
}
