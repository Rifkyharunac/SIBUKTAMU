import { ActiveVisitRedirect } from "@/components/active-visit-redirect";
import { GuestForm } from "@/components/guest-form";
import { PublicShell } from "@/components/public-shell";

export default function VisitPage() {
  return <PublicShell><ActiveVisitRedirect /><GuestForm /></PublicShell>;
}
