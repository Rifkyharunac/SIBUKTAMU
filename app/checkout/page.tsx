"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, LogOut, RefreshCw, Search, Users } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api-client";
import { clearActiveVisit } from "@/lib/active-visit";

type Guest = {id:string; name:string; visitCode:string; queueNumber:number; checkInAt:string};
type Directory = {visits:Guest[];total:number;page:number;pageSize:number};
const arrival = (date:string) => new Intl.DateTimeFormat("id-ID", {timeZone:"Asia/Makassar",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(date));

export default function CheckoutPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Directory>({visits:[],total:0,page:1,pageSize:25});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Guest | null>(null);
  const [completed, setCompleted] = useState("");
  const [receipt, setReceipt] = useState<{visitCode:string;surveyToken?:string} | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [surveySent, setSurveySent] = useState(false);
  const requestId = useRef(0);
  const sending = useRef(false);

  useEffect(() => { const timer = window.setTimeout(() => {setSearch(query.trim());setPage(1);}, 300); return () => window.clearTimeout(timer); }, [query]);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await apiRequest<Directory>(`/api/checkout/active?search=${encodeURIComponent(search)}&page=${page}`);
      if (id !== requestId.current) return;
      if (page > 1 && !result.visits.length) {setPage(1);return;}
      setData(result);setError("");
    } catch (caught) { if (id === requestId.current) setError(caught instanceof Error ? caught.message : "Daftar tamu belum dapat dimuat."); }
    finally {if (id === requestId.current) setLoading(false);}
  }, [search, page]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {if (!document.hidden && !sending.current) void refresh();}, 30000);
    const onFocus = () => {if (!sending.current) void refresh();};
    window.addEventListener("focus", onFocus);
    return () => {++requestId.current;window.clearInterval(timer);window.removeEventListener("focus", onFocus);};
  }, [refresh]);

  async function complete() {
    if (!selected || sending.current) return;
    sending.current = true;setSubmitting(true);setError("");
    ++requestId.current;
    try {
      const result = await apiRequest<{success:boolean;visitCode:string;surveyToken?:string}>("/api/checkout/active", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitId:selected.id})});
      if (!result.success) throw new Error("Status belum dikonfirmasi. Silakan muat ulang daftar.");
      clearActiveVisit(result.visitCode);
      setCompleted(selected.name);setReceipt(result);setRating(0);setFeedback("");setSurveySent(false);
      setData(previous => ({...previous,visits:previous.visits.filter(guest => guest.id !== selected.id),total:Math.max(0,previous.total-1)}));
      setSelected(null);
      await refresh();
    } catch (caught) {
      setSelected(null);
      await refresh();
      setError(caught instanceof Error ? caught.message : "Layanan belum berhasil diselesaikan.");
    } finally {sending.current=false;setSubmitting(false);}
  }

  async function sendSurvey() {
    if (!receipt?.surveyToken || !rating || submitting) return;
    setSubmitting(true);setError("");
    try {
      await apiRequest("/api/checkout", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...receipt,rating,feedback})});
      setSurveySent(true);
    } catch (caught) {setError(caught instanceof Error ? caught.message : "Penilaian belum terkirim.");}
    finally {setSubmitting(false);}
  }

  return <PublicShell>
    <section className="mx-auto min-h-[72vh] max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7 flex items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700"><LogOut className="size-7" /></div>
        <div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Buku tamu digital</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Selesaikan layanan</h1><p className="mt-3 leading-7 text-slate-600">Cari nama Anda, lalu tekan <strong>Selesaikan layanan</strong> setelah urusan selesai. Tidak perlu memasukkan nomor antrean.</p></div>
      </div>
      {completed && <div role="status" className="mb-5 flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-900"><CheckCircle2 className="mt-1 size-6 shrink-0" /><div><p className="font-bold">Terima kasih, {completed}.</p><p className="mt-1 text-sm">Layanan telah selesai. Waktu keluar sudah tercatat dan nama telah dihapus dari daftar aktif.</p></div></div>}
      {receipt?.surveyToken && <div className="mb-5 rounded-2xl border border-sky-100 bg-white p-5">
        {surveySent ? <p role="status" className="text-sm font-semibold text-sky-800">Terima kasih atas penilaian Anda.</p> : <><h2 className="font-bold">Bagaimana pelayanan kami?</h2><p className="mt-1 text-sm text-slate-500">Opsional. Kunjungan Anda sudah tercatat selesai.</p><div className="mt-3 flex flex-wrap gap-2">{[[4,"Sangat Baik"],[3,"Baik"],[2,"Cukup"],[1,"Kurang"]].map(([value,label]) => <Button key={value} variant={rating===value ? "default" : "outline"} onClick={() => setRating(Number(value))} aria-pressed={rating===value}>{label}</Button>)}</div>{rating > 0 && <><label htmlFor="survey-feedback" className="mt-4 block text-sm font-semibold">Saran atau masukan (opsional)</label><Textarea id="survey-feedback" className="mt-2" maxLength={1000} value={feedback} onChange={event=>setFeedback(event.target.value)} /><Button className="mt-3" disabled={submitting} onClick={() => void sendSurvey()}>Kirim penilaian</Button></>}</>}
      </div>}
      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-xl shadow-sky-900/5">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><Users className="size-5 text-sky-700" />Tamu yang belum selesai</h2><Button variant="outline" size="sm" disabled={loading || submitting} onClick={() => void refresh()} aria-label="Perbarui daftar"><RefreshCw className={loading ? "animate-spin" : ""} /><span className="hidden sm:inline">Perbarui</span></Button></div>
          <label htmlFor="guest-search" className="mt-5 block text-sm font-semibold">Cari nama Anda</label>
          <div className="relative mt-2"><Search className="absolute left-3 top-3.5 size-5 text-slate-400" /><Input id="guest-search" autoComplete="off" maxLength={100} placeholder="Ketik nama saat mendaftar" value={query} onChange={event => setQuery(event.target.value)} className="h-12 pl-10" /></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Jika ada nama yang sama, cocokkan nomor antrean dan waktu kedatangan. Pilih hanya kunjungan milik Anda.</p>
        </div>
        <div aria-busy={loading}>
          {loading && <p role="status" className="px-6 pt-4 text-sm text-sky-700">Memperbarui daftar…</p>}
          {!loading && !error && !data.visits.length && <div className="px-6 py-12 text-center"><CheckCircle2 className="mx-auto size-10 text-sky-600" /><h3 className="mt-4 font-bold">{search ? "Nama belum ditemukan" : "Tidak ada tamu yang belum selesai"}</h3><p className="mt-2 text-sm text-slate-500">{search ? "Periksa ejaan nama atau minta bantuan petugas. Kunjungan yang selesai tidak muncul lagi." : "Daftar akan terisi saat ada kunjungan baru."}</p></div>}
          <ul className="divide-y divide-slate-100">{data.visits.map(guest => <li key={guest.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="min-w-0"><h3 className="break-words text-lg font-bold text-slate-900">{guest.name}</h3><p className="mt-1 text-sm text-slate-500">Antrean {String(guest.queueNumber).padStart(3,"0")} · {arrival(guest.checkInAt)} WITA</p></div><Button className="h-11 shrink-0 bg-sky-700 hover:bg-sky-800" disabled={submitting || loading} onClick={() => {setSelected(guest);setError("");}}><CheckCircle2 />Selesaikan layanan<span className="sr-only"> untuk {guest.name}</span></Button></li>)}</ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-sky-50/50 px-5 py-4 text-sm"><p className="text-slate-500">{data.total} tamu{search ? " ditemukan" : " belum selesai"}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading || submitting} onClick={() => setPage(value => value-1)}>Sebelumnya</Button><Button size="sm" variant="outline" disabled={page*data.pageSize >= data.total || loading || submitting} onClick={() => setPage(value => value+1)}>Berikutnya</Button></div></div>
      </div>
      <p className="mt-5 text-sm text-slate-500">Daftar diperbarui otomatis. Butuh bantuan? Hubungi petugas penerima tamu.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-sky-700 hover:underline">Kembali ke beranda</Link>
      <Dialog open={!!selected} onOpenChange={open => {if (!open && !submitting) setSelected(null);}}>
        <DialogContent showCloseButton={!submitting}><DialogHeader><DialogTitle>Selesaikan layanan Anda?</DialogTitle><DialogDescription>Pastikan kunjungan berikut milik Anda dan pelayanan sudah selesai. Waktu keluar akan langsung dicatat.</DialogDescription></DialogHeader><div className="rounded-xl bg-sky-50 p-4"><p className="break-words text-lg font-bold">{selected?.name}</p>{selected && <p className="mt-1 text-sm text-slate-600">Antrean {String(selected.queueNumber).padStart(3,"0")} · {arrival(selected.checkInAt)} WITA</p>}</div><DialogFooter><Button variant="outline" disabled={submitting} onClick={() => setSelected(null)}>Belum selesai</Button><Button disabled={submitting} onClick={() => void complete()}>{submitting ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}Ya, selesaikan layanan</Button></DialogFooter></DialogContent>
      </Dialog>
    </section>
  </PublicShell>;
}
