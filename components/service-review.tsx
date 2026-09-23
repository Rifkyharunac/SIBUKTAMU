"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

const reactions = [
  {value:1, emoji:"😞", label:"Tidak puas"},
  {value:2, emoji:"😐", label:"Cukup puas"},
  {value:3, emoji:"🙂", label:"Puas"},
  {value:4, emoji:"😍", label:"Sangat puas"},
];

export function ServiceReview({visitCode, token, phone, surveyToken}: {visitCode:string;token?:string;phone?:string;surveyToken?:string}) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  async function submit() {
    if (!rating || sending.current) return;
    sending.current=true;setBusy(true);setError("");
    try {
      const result = await apiRequest<{success:boolean}>("/api/checkout", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitCode,token,phone,surveyToken,rating,feedback})});
      if (!result.success) throw new Error("Penilaian belum tersimpan. Silakan coba kembali.");
      setSent(true);
    } catch (caught) {setError(caught instanceof Error ? caught.message : "Penilaian belum terkirim.");}
    finally {sending.current=false;setBusy(false);}
  }
  return <section className="my-5 rounded-2xl border border-sky-100 bg-white p-5 text-left sm:p-6" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-lg font-bold text-slate-900">Bagaimana pengalaman pelayanan Anda?</h2>
    {sent ? <p role="status" className="mt-4 flex items-center gap-2 font-semibold text-sky-800"><CheckCircle2 className="size-5 shrink-0" />Terima kasih! Penilaian Anda sudah tersimpan.</p> : <>
      <p className="mt-2 text-sm leading-6 text-slate-600">Pilih ekspresi yang sesuai dengan kepuasan Anda. Penilaian ini opsional; layanan sudah tercatat selesai.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Tingkat kepuasan pelayanan">{reactions.map(item=><button type="button" key={item.value} disabled={busy} aria-pressed={rating===item.value} onClick={()=>setRating(item.value)} className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border-2 p-3 text-center transition disabled:opacity-60 ${rating===item.value ? "border-sky-600 bg-sky-50 text-sky-950 shadow-sm" : "border-slate-100 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"}`}><span aria-hidden="true" className="text-4xl">{item.emoji}</span><span className="text-sm font-semibold">{item.label}</span></button>)}</div>
      {rating>0 && <div className="mt-5"><label htmlFor={`${id}-feedback`} className="text-sm font-semibold">Saran atau masukan (opsional)</label><Textarea id={`${id}-feedback`} disabled={busy} maxLength={1000} className="mt-2" value={feedback} onChange={event=>setFeedback(event.target.value)} placeholder="Ceritakan pengalaman Anda" /><Button className="mt-3 h-11" disabled={busy} onClick={()=>void submit()}>{busy && <LoaderCircle className="animate-spin" />}Kirim penilaian</Button></div>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    </>}
  </section>;
}
