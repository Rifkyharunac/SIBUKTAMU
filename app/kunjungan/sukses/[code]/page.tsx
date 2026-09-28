"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useParams,useSearchParams} from 'next/navigation';
import {CheckCircle2} from 'lucide-react';
import {PublicShell} from '@/components/public-shell';
import {ServiceReview} from '@/components/service-review';
import {Button} from '@/components/ui/button';
import {clearActiveVisit} from '@/lib/active-visit';
export default function VisitSuccessPage(){
 const {code}=useParams<{code:string}>(),search=useSearchParams(),kiosk=search.get('kiosk')==='1';
 const [token,setToken]=useState('');
 useEffect(()=>{setToken(new URLSearchParams(window.location.hash.slice(1)).get('token')||'');clearActiveVisit();},[]);
 return <PublicShell kiosk={kiosk}><section className="mx-auto max-w-2xl px-4 py-10 sm:py-14"><div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-xl shadow-sky-900/10"><div className="bg-sky-700 px-6 py-9 text-center text-white"><CheckCircle2 className="mx-auto size-14"/><h1 className="mt-4 text-2xl font-bold sm:text-3xl">Terima kasih atas kunjungan Anda</h1><p className="mt-3 leading-7 text-sky-100">Buku tamu Anda telah berhasil tersimpan di Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah.</p></div><div className="p-5 sm:p-8"><p className="text-center text-sm text-slate-500">Nomor kunjungan: <strong>{code}</strong></p>{token?<ServiceReview visitCode={code} token={token}/>:<p className="my-6 text-center text-slate-600">Terima kasih telah mengisi buku tamu.</p>}<Button asChild variant="outline" className="min-h-12 w-full"><Link href={kiosk?'/kiosk':'/'}>{kiosk?'Siapkan untuk tamu berikutnya':'Kembali ke beranda'}</Link></Button></div></div></section></PublicShell>;
}
