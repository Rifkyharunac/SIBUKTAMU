import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  FileDown,
  LogOut,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ActiveVisitRedirect } from "@/components/active-visit-redirect";
import { Button } from "@/components/ui/button";

const laborServices = [
  "Pencari kerja & lowongan",
  "Pelatihan dan penempatan kerja",
  "Hubungan industrial",
  "Pengupahan & jaminan sosial",
  "Pengawasan ketenagakerjaan",
  "Pengaduan masalah tenaga kerja",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8f7] text-slate-950">
      <ActiveVisitRedirect />
      <header className="relative z-30 border-b border-emerald-900/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link href="/checkout" className="hidden text-sm font-semibold text-slate-600 hover:text-[#087f5b] sm:block">Check-out</Link>
            <Button asChild variant="outline" size="sm"><Link href="/admin/login">Masuk Petugas</Link></Button>
          </div>
        </div>
      </header>

      <section className="hero-3d-shell relative border-b border-emerald-900/10">
        <div className="hero-building-photo absolute inset-0" aria-hidden="true">
          <Image
            src="/gedung-disnakertrans-sulteng.webp"
            alt=""
            width="1440"
            height="1084"
            priority
            unoptimized
            sizes="100vw"
          />
        </div>
        <div className="hero-building-overlay absolute inset-0" aria-hidden="true" />
        <div className="hero-3d-grid absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md"><Clock3 className="size-4 text-emerald-200" />Mudah diisi dari ponsel</div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-emerald-200">SIBUKTAMU · Layanan Tenaga Kerja</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[1.06] tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">Datang, pilih layanan, lalu petugas siap membantu.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-50/90">Buku tamu digital Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah. Sistem mengarahkan kunjungan ke bidang tenaga kerja yang tepat tanpa akun tamu.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-13 bg-[#087f5b] px-6 text-base shadow-lg shadow-emerald-900/15 hover:bg-[#066c4d]"><Link href="/kunjungan"><QrCode />Isi buku tamu<ArrowRight /></Link></Button>
              <Button asChild variant="outline" className="h-13 border-white/35 bg-white/12 px-6 text-base text-white backdrop-blur-md hover:bg-white/20 hover:text-white"><Link href="/checkout"><LogOut />Check-out kunjungan</Link></Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-emerald-50/90">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-200" />Tanpa login tamu</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-200" />Tanpa NIK/KTP</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-200" />Tanda tangan digital</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg [perspective:1200px]">
            <div className="absolute -inset-4 rounded-[2.5rem] border border-white/15 bg-white/5 [transform:rotateY(-9deg)_rotateX(4deg)]" aria-hidden="true" />
            <div className="relative rounded-[2rem] border border-white/40 bg-white p-6 shadow-[16px_24px_0_rgba(0,40,30,.2),0_45px_90px_rgba(0,0,0,.35)] sm:p-8">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5"><img src="/logo-sulteng-small.png" width="60" height="60" alt="Lambang Sulawesi Tengah" /><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Selamat datang</p><h2 className="mt-1 text-2xl font-black text-slate-900">Buku tamu digital</h2></div></div>
              <p className="mt-5 text-sm leading-6 text-slate-600">Catat kedatangan Anda, kemudian silakan menuju petugas layanan.</p>
              <ol className="my-6 space-y-5">{[
                ["Isi identitas", "Nama, asal, dan nomor HP yang dapat dihubungi."],
                ["Pilih layanan", "Tentukan keperluan dan bubuhkan tanda tangan."],
                ["Selesaikan kunjungan", "Simpan halaman bukti. Tekan selesai setelah urusan tuntas."],
              ].map(([title,desc],i)=><li key={title} className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 font-black text-emerald-800 shadow-[0_3px_0_#c5e7da]">{i+1}</span><div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{desc}</p></div></li>)}</ol>
              <Button asChild className="h-13 w-full rounded-xl bg-[#087f5b] text-base shadow-[0_4px_0_#045740] hover:bg-[#066c4d]"><Link href="/kunjungan">Mulai isi buku tamu<ArrowRight /></Link></Button>
              <p className="mt-5 text-center text-xs leading-5 text-slate-500">Butuh bantuan mengisi? Silakan hubungi petugas penerima tamu.</p>
            </div>
          </div>
          <a href="https://disnakertrans.sultengprov.go.id/foto/detail/8" target="_blank" rel="noreferrer" className="hero-photo-credit absolute bottom-4 right-4 z-20 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md hover:text-white">Foto resmi Kantor DISNAKERTRANS</a>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#087f5b]">Fokus layanan saat ini</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Kebutuhan ketenagakerjaan dalam satu pintu.</h2><p className="mt-4 leading-7 text-slate-600">Pilih keperluan saat mengisi buku tamu. Sistem meneruskan data kepada bidang P4TK atau HIWAS sesuai layanan.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{laborServices.map((service, index) => <div key={service} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fbfa] p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-sm font-black text-[#087f5b]">{String(index + 1).padStart(2, "0")}</span><p className="font-bold text-slate-800">{service}</p></div>)}</div>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-5"><Building2 className="size-6 text-[#087f5b]" /><h3 className="mt-4 font-black">Bidang tujuan jelas</h3><p className="mt-2 text-sm leading-6 text-slate-600">Layanan langsung diarahkan ke bidang penanggung jawab yang tepat.</p></div>
            <div className="rounded-2xl border border-slate-200 p-5"><Bell className="size-6 text-[#087f5b]" /><h3 className="mt-4 font-black">Notifikasi petugas</h3><p className="mt-2 text-sm leading-6 text-slate-600">Petugas menerima detail kedatangan agar pelayanan lebih responsif.</p></div>
            <div className="rounded-2xl border border-slate-200 p-5"><ShieldCheck className="size-6 text-[#087f5b]" /><h3 className="mt-4 font-black">Data terkelola</h3><p className="mt-2 text-sm leading-6 text-slate-600">Kunjungan tercatat, dapat dipantau, dan siap direkap untuk laporan dinas.</p></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#f4f8f7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="font-bold text-slate-700">Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah</p><p className="mt-1">Jl. RA. Kartini No. 98, Palu Timur, Kota Palu</p></div>
          <Link href="/privacy" className="font-semibold text-[#087f5b]">Kebijakan Privasi</Link>
        </div>
      </footer>
    </main>
  );
}
