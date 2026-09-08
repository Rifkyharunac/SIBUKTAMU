import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin-workspace";
import { getAdminIdentity } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getAdminIdentity();
  if (!identity) redirect(`/admin/login?returnTo=${encodeURIComponent(`/admin/kunjungan/${id}`)}`);
  if (identity.mustChangePassword) redirect("/admin/password");
  return <AdminWorkspace section="kunjungan" initialIdentity={identity} focusedVisitId={id} />;
}
