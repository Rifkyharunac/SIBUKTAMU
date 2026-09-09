"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, LogOut } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { clearActiveVisit, getActiveVisit } from "@/lib/active-visit";

const ratings = [
  { value: 4, emoji: "😊", label: "Sangat Baik" },
  { value: 3, emoji: "🙂", label: "Baik" },
  { value: 2, emoji: "😐", label: "Cukup" },
  { value: 1, emoji: "☹️", label: "Kurang" },
];

export default function CheckoutPage() {
  const search = useSearchParams();
  const [phone, setPhone] = useState("");
  const [visitCode, setVisitCode] = useState(() => search.get("code")?.trim().toUpperCase() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ durationMinutes: number } | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [surveySent, setSurveySent] = useState(false);

  useEffect(() => {
    if (search.get("code")) return;
    const active = getActiveVisit();
    if (!active) return;
    const timeout = window.setTimeout(() => setVisitCode(active.code), 0);
    return () => window.clearTimeout(timeout);
  }, [search]);

  async function checkout() {
    setLoading(true); setError("");
    try {
      const data = await apiRequest<{ durationMinutes: number }>("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitCode, phone }) });
      if (typeof data.durationMinutes !== "number") throw new Error("Kunjungan belum dikonfirmasi selesai. Silakan coba kembali.");
      clearActiveVisit(visitCode.trim().toUpperCase());
      setSuccess({ durationMinutes: data.durationMinutes ?? 0 });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Check-out belum berhasil."); }
    finally { setLoading(false); }
  }

  async function sendSurvey() {
    if (!rating) return;
    setLoading(true); setError("");
    try {
      const result = await apiRequest<{ success: boolean }>("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitCode, phone, rating, feedback }) });
      if (result.success !== true) throw new Error("Penilaian belum dikonfirmasi. Silakan coba kembali.");
      setSurveySent(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Penilaian belum terkirim. Silakan coba kembali."); }
    finally { setLoading(false); }

  }

  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[72vh] max-w-2xl place-items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-[0_20px_60px_rgba(15,72,56,0.10)] sm:p-8">
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
          {!success ? <>
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#087f5b]"><LogOut className="size-6" /></div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Check-out kunjungan</h1>
            <p className="mt-2 leading-7 text-slate-600">Masukkan kode kunjungan. Jam keluar dan durasi akan dihitung otomatis.</p>
            <label className="mt-7 block text-sm font-bold text-slate-800">Kode kunjungan</label>
            <Input className="mt-2 h-13 rounded-xl px-4 text-lg font-bold uppercase tracking-wide" placeholder="BT-20260828-001" value={visitCode} onChange={(event) => setVisitCode(event.target.value.toUpperCase())} />
            <label className="mt-4 block text-sm font-semibold">Nomor HP saat mendaftar<Input type="tel" autoComplete="tel" className="mt-2 h-12" placeholder="08xxxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <Button className="mt-5 h-12 w-full bg-[#087f5b] text-base hover:bg-[#066c4d]" disabled={loading} onClick={checkout}>{loading ? <><LoaderCircle className="animate-spin" />Memproses…</> : "Selesaikan kunjungan"}</Button>
          </> : <>
            <CheckCircle2 className="size-14 text-[#087f5b]" />
            <h1 className="mt-4 text-2xl font-extrabold">Check-out berhasil</h1>
            <p className="mt-2 text-slate-600">Durasi kunjungan tercatat sekitar <strong>{success.durationMinutes} menit</strong>.</p>
            {!surveySent ? <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="font-bold text-slate-900">Bagaimana pelayanan kami?</h2>
              <p className="mt-1 text-sm text-slate-500">Opsional, pilih satu penilaian.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{ratings.map((item) => <button type="button" key={item.value} onClick={() => setRating(item.value)} className={`rounded-xl border p-3 text-center transition ${rating === item.value ? "border-[#087f5b] bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:bg-slate-50"}`}><span className="text-2xl">{item.emoji}</span><span className="mt-1 block text-xs font-semibold">{item.label}</span></button>)}</div>
              {rating > 0 && <><Textarea className="mt-4 rounded-xl" placeholder="Saran / masukan (opsional)" value={feedback} onChange={(event) => setFeedback(event.target.value)} /><Button variant="outline" className="mt-3" disabled={loading} onClick={sendSurvey}>Kirim penilaian</Button></>}
            </div> : <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Terima kasih atas penilaian Anda.</p>}
            <Button asChild className="mt-6 h-11 bg-[#087f5b] hover:bg-[#066c4d]"><Link href="/">Kembali ke beranda</Link></Button>
          </>}
        </div>
      </section>
    </PublicShell>
  );
}
