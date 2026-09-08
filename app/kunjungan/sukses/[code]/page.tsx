"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Link2,
  LoaderCircle,
  LogOut,
  MapPin,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { clearActiveVisit, saveActiveVisit } from "@/lib/active-visit";

type CheckoutResult = {
  durationMinutes?: number;
  alreadyCompleted?: boolean;
};

export default function VisitSuccessPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = decodeURIComponent(params.code ?? "").toUpperCase();
  const kiosk = search.get("kiosk") === "1";
  const resumePath = useMemo(() => {
    const query = search.toString();
    return `/kunjungan/sukses/${encodeURIComponent(code)}${query ? `?${query}` : ""}`;
  }, [code, search]);
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [completed, setCompleted] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    const privateToken = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    setToken(privateToken);
    if (!kiosk && /^BT-\d{8}-\d{3,}$/.test(code)) saveActiveVisit({ code, resumePath: resumePath + window.location.hash, savedAt: Date.now() });
    if (privateToken) fetch("/api/checkout", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitCode:code,token:privateToken,action:"STATUS"})}).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as CheckoutResult & {checkOutAt?:string;status?:string};
      if (data.checkOutAt) { clearActiveVisit(code); setCompleted({...data,alreadyCompleted:true}); }
      if (data.status === "BATAL") { clearActiveVisit(code); setCheckoutError("Kunjungan telah dibatalkan. Hubungi petugas."); }
    }).catch(() => {});
  }, [code, kiosk, resumePath]);

  async function copyValue(value: string, type: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function finishVisit() {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitCode: code, token, phone }),
      });
      const raw = await response.text();
      let data: (CheckoutResult & { error?: string }) = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!response.ok) throw new Error(data.error || "Kunjungan belum berhasil diselesaikan.");
      clearActiveVisit(code);
      setCompleted(data);
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : "Kunjungan belum berhasil diselesaikan.");
    } finally {
      setCheckingOut(false);
    }
  }

  const shareUrl = typeof window === "undefined" ? resumePath : `${window.location.origin}${resumePath}${window.location.hash}`;

  if (completed) {
    return (
      <PublicShell kiosk={kiosk}>
        <section className="visit-finish-page mx-auto grid min-h-[78vh] max-w-2xl place-items-center px-4 py-12 sm:px-6">
          <div className="visit-success-card w-full overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-[0_30px_80px_rgba(4,61,49,0.18)]">
            <div className="bg-[#087f5b] px-6 py-9 text-center text-white">
              <CheckCircle2 className="mx-auto size-16" />
              <h1 className="mt-4 text-3xl font-black">Kunjungan selesai</h1>
              <p className="mt-2 text-emerald-100">Jam keluar sudah tercatat pada dashboard petugas.</p>
            </div>
            <div className="p-6 text-center sm:p-9">
              <p className="text-sm text-slate-600">
                {completed.alreadyCompleted
                  ? "Kunjungan ini sebelumnya sudah diselesaikan."
                  : completed.durationMinutes !== undefined
                    ? <>Durasi kunjungan tercatat sekitar <strong>{completed.durationMinutes} menit</strong>.</>
                    : "Data kunjungan telah diperbarui."}
              </p>
              {!kiosk && <Button asChild className="mt-7 h-12 rounded-xl bg-[#087f5b] px-7 text-base hover:bg-[#066c4d]"><Link href="/">Kembali ke beranda</Link></Button>}
              {kiosk && <Button asChild className="mt-7 h-12 rounded-xl bg-[#087f5b] px-7 text-base hover:bg-[#066c4d]"><Link href="/kiosk">Siapkan untuk tamu berikutnya</Link></Button>}
            </div>
          </div>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell kiosk={kiosk}>
      <section className="visit-finish-page mx-auto grid min-h-[82vh] max-w-3xl place-items-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="print-area visit-success-card w-full overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-[0_30px_80px_rgba(4,61,49,0.18)]">
          <div className="relative overflow-hidden bg-[#087f5b] px-6 py-8 text-center text-white sm:py-10">
            <div className="success-orb success-orb-one" aria-hidden="true" />
            <div className="success-orb success-orb-two" aria-hidden="true" />
            <CheckCircle2 className="relative mx-auto size-14" />
            <h1 className="relative mt-4 text-2xl font-black sm:text-3xl">Kunjungan Anda sudah tercatat</h1>
            <p className="relative mx-auto mt-2 max-w-lg text-sm leading-6 text-emerald-100 sm:text-base">Tetap gunakan halaman ini. Setelah urusan selesai, cukup tekan tombol “Selesaikan kunjungan” di bagian bawah.</p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="visit-code-panel rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087f5b]">Kode kunjungan aktif</p>
              <p className="mt-2 break-all text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">{code}</p>
              <Button type="button" variant="outline" size="sm" className="mt-4 border-emerald-300 bg-white" onClick={() => copyValue(code, "code")}>
                {copied === "code" ? <Check /> : <Copy />}{copied === "code" ? "Kode tersalin" : "Salin kode"}
              </Button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 sm:p-5">
              <div className="flex items-start gap-3"><Clock3 className="mt-0.5 size-5 shrink-0 text-[#087f5b]" /><div><p className="font-bold text-slate-900">Jam masuk</p><p className="mt-0.5 text-slate-600">{search.get("time") || "Tercatat otomatis"} WITA</p></div></div>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-[#087f5b]" /><div><p className="font-bold text-slate-900">Tujuan layanan</p><p className="mt-0.5 text-slate-600">{search.get("department") || "Bidang tujuan"}</p><p className="mt-0.5 text-xs text-slate-500">{search.get("service")}</p></div></div>
            </div>

            {!kiosk && (
              <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-700" />
                  <div>
                    <p className="font-bold text-sky-950">Halaman ini tersimpan otomatis</p>
                    <p className="mt-1 text-sm leading-6 text-sky-900/80">Jika browser ini ditutup lalu dibuka kembali, sistem akan mengembalikan Anda ke halaman ini. Untuk browser lain, gunakan tautan pribadi berikut. Jangan membagikannya kepada orang lain. Penyimpanan otomatis memerlukan izin penyimpanan browser.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" className="mt-4 h-11 w-full border-sky-300 bg-white text-sky-900 hover:bg-sky-100" onClick={() => copyValue(shareUrl, "link")}>
                  {copied === "link" ? <Check /> : <Link2 />}{copied === "link" ? "Tautan tersalin" : "Salin tautan untuk browser lain"}
                </Button>
              </div>
            )}

            {!token && <label className="mt-5 block text-sm font-semibold">Nomor HP saat mendaftar<input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-2 block h-12 w-full rounded-xl border px-4" placeholder="08xxxxxxxxxx" /></label>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" className="h-12 sm:w-auto" onClick={() => window.print()}><Printer />Cetak bukti</Button>
              <Button type="button" className="h-12 flex-1 rounded-xl bg-[#087f5b] text-base font-bold shadow-lg shadow-emerald-900/15 hover:bg-[#066c4d]" disabled={checkingOut} onClick={finishVisit}>
                {checkingOut ? <><LoaderCircle className="animate-spin" />Mencatat jam keluar…</> : <><LogOut />Selesaikan kunjungan</>}
              </Button>
            </div>
            <p className="mt-3 text-center text-sm leading-6 text-slate-500">Tekan tombol tersebut hanya setelah seluruh keperluan Anda di kantor selesai.</p>
            {checkoutError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{checkoutError}</div>}
            {kiosk && <p className="mt-5 text-center text-xs text-slate-500">Halaman ini tetap terbuka sampai kunjungan diselesaikan.</p>}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
