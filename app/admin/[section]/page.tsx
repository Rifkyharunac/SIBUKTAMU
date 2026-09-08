import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin-workspace";
import { getAdminIdentity } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const identity = await getAdminIdentity();
  if (!identity) redirect(`/admin/login?returnTo=${encodeURIComponent(`/admin/${section}`)}`);
  if (identity.mustChangePassword) redirect("/admin/password");
  return <AdminWorkspace section={section} initialIdentity={identity} />;
}
