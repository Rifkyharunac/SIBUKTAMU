"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordChangeForm({ name, required }: { name: string; required: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ success: boolean }>("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (result.success !== true) throw new Error("Layanan belum mengonfirmasi perubahan. Silakan coba kembali.");
      window.location.assign("/admin/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sandi belum dapat diubah.");
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#e0f2fe] px-4 py-10"><section className="w-full max-w-xl overflow-hidden rounded-3xl border border-sky-950/10 bg-white shadow-2xl shadow-sky-950/10"><div className="bg-[#0369a1] p-6"><BrandMark inverse /></div><div className="p-7 sm:p-9"><div className="grid size-12 place-items-center rounded-xl bg-sky-100 text-[#0369a1]"><ShieldCheck className="size-6" /></div><p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0369a1]">Pengamanan Akun</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Buat sandi pribadi Anda</h1><p className="mt-3 text-sm leading-6 text-slate-500">Selamat datang, {name}. {required ? "Sandi sementara wajib diganti sebelum dashboard dapat digunakan." : "Gunakan sandi saat ini untuk membuat sandi baru. Sesi lain akan diakhiri setelah sandi berubah."}</p>{error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-semibold text-rose-800">{error}</div>}<form onSubmit={submit} className="mt-6 space-y-4"><PasswordField label={required ? "Sandi Sementara" : "Sandi Saat Ini"} value={currentPassword} setValue={setCurrentPassword} autoComplete="current-password" /><PasswordField label="Sandi Baru" value={newPassword} setValue={setNewPassword} autoComplete="new-password" /><PasswordField label="Ulangi Sandi Baru" value={confirmPassword} setValue={setConfirmPassword} autoComplete="new-password" /><div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Ketentuan:</strong> minimal 10 karakter, memuat huruf besar, huruf kecil, dan angka.</div><Button type="submit" disabled={loading} className="h-12 w-full bg-[#0369a1] font-extrabold hover:bg-[#075985]">{loading ? <><LoaderCircle className="animate-spin" />Menyimpan…</> : <><KeyRound />Simpan Sandi dan Masuk</>}</Button></form>{!required && <Link href="/admin/dashboard" className="mt-5 block text-sm font-semibold text-sky-800">Kembali ke dashboard</Link>}<LogoutButton className="text-slate-600 hover:bg-slate-100" /></div></section></main>;
}

function PasswordField({ label, value, setValue, autoComplete }: { label: string; value: string; setValue: (value: string) => void; autoComplete: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">{label}</span><Input type="password" autoComplete={autoComplete} className="h-12 bg-white" value={value} onChange={(event) => setValue(event.target.value)} required /></label>;
}
