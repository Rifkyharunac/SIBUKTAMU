import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function PublicShell({ children, kiosk = false }: { children: React.ReactNode; kiosk?: boolean }) {
  return (
    <main className="public-site-shell min-h-screen bg-[#f4f8f7] text-slate-950">
      {!kiosk && (
        <header className="border-b border-emerald-900/10 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" aria-label="Beranda SIBUKTAMU"><BrandMark compact /></Link>
            <Link href="/admin/dashboard" className="hidden text-sm font-semibold text-slate-600 hover:text-[#087f5b] sm:block">
              Masuk Petugas
            </Link>
          </div>
        </header>
      )}
      {children}
      {!kiosk && (
        <footer className="border-t border-emerald-900/10 bg-white">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-6 text-sm text-slate-600 sm:grid-cols-2 sm:px-6">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[#087f5b]" />Jl. RA. Kartini No. 98, Palu Timur, Kota Palu</p>
            <p className="flex items-start gap-2 sm:justify-end"><Clock3 className="mt-0.5 size-4 shrink-0 text-[#087f5b]" />Waktu sistem: Asia/Makassar (WITA)</p>
          </div>
        </footer>
      )}
    </main>
  );
}
