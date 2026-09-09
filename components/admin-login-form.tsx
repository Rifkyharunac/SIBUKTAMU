"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm({ returnTo }: { returnTo: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ success: boolean; mustChangePassword: boolean }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (result.success !== true) throw new Error("Layanan belum mengonfirmasi perubahan. Silakan coba kembali.");
      window.location.assign(result.mustChangePassword ? "/admin/password" : returnTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login belum berhasil.");
      setLoading(false);
    }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#eaf1ee] px-4 py-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(16,185,129,0.15),transparent_28%),radial-gradient(circle_at_15%_90%,rgba(6,78,59,0.12),transparent_30%)]" />
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white shadow-[0_30px_90px_rgba(6,61,47,0.18)] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-[#063d2f] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-72 rounded-full border-[48px] border-white/5" />
        <BrandMark inverse />
        <div className="relative mt-24"><span className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10"><ShieldCheck className="size-7 text-emerald-200" /></span><h1 className="mt-6 text-3xl font-black leading-tight">Portal Petugas<br />SIBUKTAMU</h1><p className="mt-4 max-w-sm text-sm leading-7 text-emerald-100/75">Akses internal untuk memantau kedatangan, memperbarui pelayanan, dan menyusun laporan resmi.</p></div>
        <p className="relative mt-16 text-xs font-semibold text-emerald-200/70">Dinas Tenaga Kerja dan Transmigrasi<br />Provinsi Sulawesi Tengah</p>
      </div>
      <div className="p-6 sm:p-10 lg:p-12">
        <div className="lg:hidden"><BrandMark /></div>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-[#087f5b] lg:mt-0">Administrasi Internal</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Masuk sebagai Petugas</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Gunakan username dan sandi yang diberikan oleh administrator instansi.</p>
        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-semibold text-rose-800">{error}</div>}
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">Username</span><div className="relative"><UserRound className="absolute left-3.5 top-3.5 size-5 text-slate-400" /><Input autoFocus autoComplete="username" className="h-12 bg-white pl-11" placeholder="Masukkan username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div></label>
          <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">Sandi</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 size-5 text-slate-400" /><Input autoComplete="current-password" type={showPassword ? "text" : "password"} className="h-12 bg-white px-11" placeholder="Masukkan sandi" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="absolute right-3 top-2.5 grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
          <Button type="submit" disabled={loading} className="h-12 w-full bg-[#087f5b] text-base font-extrabold hover:bg-[#066c4d]">{loading ? <><LoaderCircle className="animate-spin" />Memeriksa Akun…</> : "Masuk ke Dashboard"}</Button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-400">Akun dilindungi pembatasan percobaan login dan sesi aman selama 12 jam.</p>
      </div>
    </section>
  </main>;
}
