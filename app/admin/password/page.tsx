import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/password-change-form";
import { getAdminIdentity } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin/login?returnTo=%2Fadmin%2Fpassword");
  return <PasswordChangeForm name={identity.name} required={identity.mustChangePassword} />;
}
