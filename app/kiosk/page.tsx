import { GuestForm } from "@/components/guest-form";
import { PublicShell } from "@/components/public-shell";
import { BrandMark } from "@/components/brand-mark";

export default function KioskPage() {
  return <PublicShell kiosk><div className="border-b border-sky-900/10 bg-white px-6 py-4"><BrandMark /></div><GuestForm source="KIOSK" kiosk /></PublicShell>;
}
