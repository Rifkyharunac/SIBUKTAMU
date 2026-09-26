"use client";
import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell,Download,Volume2,VolumeX,X } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api-client';
import { readyAdminWorker, syncPushSubscription } from '@/lib/push-device';

const saveSubscription=(subscription:PushSubscriptionJSON)=>apiRequest('/api/admin/device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription})});

type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
type AlertItem={id:string;eventType:string;visitId:string;visitorName:string;createdAt:string};
export function AdminApp({userId,onRefresh}:{userId:string;onRefresh:()=>void}){
 const [install,setInstall]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[ios,setIos]=useState(false);
 const [sound,setSound]=useState(false),[push,setPush]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [expanded,setExpanded]=useState(false);
 const [alert,setAlert]=useState<AlertItem|null>(null);
 const receivedTest=useRef('');
 const audio=useRef<AudioContext|null>(null),refresh=useRef(onRefresh),known=useRef<Set<string>|null>(null),soundRef=useRef(false);
 refresh.current=onRefresh;soundRef.current=sound;
 function chime(){try{const ctx=audio.current;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=880;gain.gain.setValueAtTime(.12,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);osc.start();osc.stop(ctx.currentTime+.35);}catch{}}
 async function toggleSound(){if(sound){setSound(false);return;}try{audio.current??=new AudioContext();await audio.current.resume();setSound(true);chime();}catch{setMessage('Suara belum didukung. Pemberitahuan di layar tetap tersedia.');}}
 useEffect(()=>{
  const link=document.createElement('link');link.rel='manifest';link.crossOrigin='use-credentials';link.href='/admin/app.webmanifest';document.head.appendChild(link);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
  setInstalled(standalone);setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const prompt=(e:Event)=>{e.preventDefault();setInstall(e as InstallEvent);};const done=()=>{setInstalled(true);setInstall(null);};
  window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',done);
  if('serviceWorker' in navigator)readyAdminWorker().then(async reg=>{
   void reg.update().catch(()=>{});
   if('PushManager' in window && 'Notification' in window && Notification.permission==='granted'){
    const config=await apiRequest<{publicKey:string}>('/api/admin/device');
    setPush(Boolean(await syncPushSubscription(reg,config.publicKey,saveSubscription)));
   }
  }).catch(()=>setMessage('Notifikasi perangkat belum dapat diaktifkan. Notifikasi dashboard tetap tersedia.'));
  void apiRequest('/api/admin/device').catch(()=>{});
  const logout=(event:Event)=>{if(!(event.target instanceof HTMLFormElement)||!event.target.action.endsWith('/api/auth/logout'))return;navigator.serviceWorker?.getRegistration('/admin/').then(reg=>reg?.active?.postMessage({type:'CLEAR_NOTIFICATIONS'}));};
  document.addEventListener('submit',logout);
  return()=>{link.remove();window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',done);document.removeEventListener('submit',logout);void audio.current?.close();audio.current=null;};
 },[userId]);
 useEffect(()=>{
  let stopped=false,running=false;
  try{const saved=JSON.parse(localStorage.getItem('sibuktamu-alerts:'+userId)||'null');known.current=Array.isArray(saved)?new Set(saved):null;}catch{known.current=null;}
  async function poll(){if(running||document.visibilityState!=='visible')return;running=true;try{
   const result=await apiRequest<{items:AlertItem[]}>('/api/admin/alerts');if(stopped)return;
   const fresh=known.current?result.items.filter(n=>!known.current!.has(n.id)):[];
   known.current=new Set(result.items.map(n=>n.id));try{localStorage.setItem('sibuktamu-alerts:'+userId,JSON.stringify([...known.current]));}catch{}
   if(fresh.length){setAlert(fresh[0]);if(soundRef.current)chime();refresh.current();}
  }catch{/* Preserve last successful cursor while offline. */}finally{running=false;}}
  void poll();const timer=window.setInterval(poll,15000);const visible=()=>void poll();const pushed=(e:MessageEvent)=>{
   if(e.data?.type!=='SIBUKTAMU_REFRESH')return;
   if(typeof e.data.tag==='string' && e.data.tag.startsWith('test:')){
    receivedTest.current=e.data.tag;
    setMessage('Pesan uji sudah diterima perangkat dan tampilan notifikasi sudah diminta. Periksa panel notifikasi HP.');
   }
   void poll();
  };
  document.addEventListener('visibilitychange',visible);navigator.serviceWorker?.addEventListener('message',pushed);
  return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);navigator.serviceWorker?.removeEventListener('message',pushed);};
 },[userId]);
 async function enablePush(){setBusy(true);setMessage('');try{
  if(!('Notification' in window)||!('PushManager' in window))throw new Error('Browser belum mendukung notifikasi perangkat. Gunakan Chrome Android, atau instal dari Safari pada iPhone yang mendukung.');
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Izin notifikasi belum diberikan. Izinkan melalui pengaturan browser; notifikasi dashboard tetap aktif.');
  const config=await apiRequest<{publicKey:string}>('/api/admin/device');const reg=await readyAdminWorker();
  await syncPushSubscription(reg,config.publicKey,saveSubscription,true);setPush(true);setMessage('HP terdaftar menerima notifikasi. Tekan Uji kiriman server, lalu periksa panel notifikasi HP.');
 }catch(e){setMessage(e instanceof Error?e.message:'Notifikasi belum dapat diaktifkan.');}finally{setBusy(false);}}
 async function testPush(){setBusy(true);setMessage('');try{
  const reg=await readyAdminWorker();const config=await apiRequest<{publicKey:string}>('/api/admin/device');
  const sub=await syncPushSubscription(reg,config.publicKey,saveSubscription);
  if(!sub)throw new Error('Aktifkan notifikasi perangkat terlebih dahulu.');
  const result=await apiRequest<{tag:string}>('/api/admin/device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'TEST',subscription:sub.toJSON()})});
  setMessage(receivedTest.current===result.tag?'Pesan uji sudah diterima perangkat dan tampilan notifikasi sudah diminta. Periksa panel notifikasi HP.':'Kiriman diterima layanan push, belum ada bukti diterima HP. Periksa panel notifikasi. Jika tidak masuk, coba Uji tampilan HP dan Perbarui koneksi notifikasi.');
 }catch(e){setMessage(e instanceof Error?e.message:'Uji notifikasi gagal.');}finally{setBusy(false);}}
 async function testDisplay(){setBusy(true);setMessage('');try{
  if(Notification.permission!=='granted')throw new Error('Izin notifikasi belum diberikan.');
  const reg=await readyAdminWorker();
  await reg.showNotification('Uji tampilan SIBUKTAMU',{body:'Ini uji tampilan di HP, bukan kiriman dari server.',icon:'/sibuktamu-icon-192.png',tag:'sibuktamu-local-test',data:{url:'/admin/notifikasi'}});
  setMessage('Uji tampilan diminta. Jika muncul di panel HP tetapi uji kiriman server tidak muncul, perbarui koneksi notifikasi. Jika keduanya tidak muncul, periksa izin notifikasi aplikasi dan browser di HP.');
 }catch(e){setMessage(e instanceof Error?e.message:'Uji tampilan gagal.');}finally{setBusy(false);}}
 async function repairPush(){setBusy(true);setMessage('');try{
  if(Notification.permission!=='granted')throw new Error('Izinkan notifikasi HP terlebih dahulu.');
  const reg=await readyAdminWorker();const old=await reg.pushManager.getSubscription();
  if(old){
   await apiRequest('/api/admin/device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'UNSUBSCRIBE',subscription:old.toJSON()})});
   if(!await old.unsubscribe())throw new Error('Koneksi lama belum dapat dilepas. Coba kembali.');
  }
  setPush(false);
  const config=await apiRequest<{publicKey:string}>('/api/admin/device');
  await syncPushSubscription(reg,config.publicKey,saveSubscription,true);setPush(true);
  setMessage('Koneksi notifikasi diperbarui. Tekan Uji kiriman server untuk memastikan pesan masuk ke panel HP.');
 }catch(e){setPush(false);setMessage(e instanceof Error?e.message:'Koneksi notifikasi belum dapat diperbarui.');}finally{setBusy(false);}}
 async function disablePush(){setBusy(true);try{const reg=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Aplikasi belum siap. Muat ulang halaman lalu coba kembali.")),10000))]);const sub=await reg.pushManager.getSubscription();if(sub){await apiRequest('/api/admin/device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'UNSUBSCRIBE',subscription:sub.toJSON()})});await sub.unsubscribe();}setPush(false);}catch{setMessage('Belum dapat menonaktifkan notifikasi. Coba kembali.');}finally{setBusy(false);}}
 return <section className="mb-5 rounded-2xl border border-sky-200 bg-white p-4" aria-label="Aplikasi dan pemberitahuan admin">
  <div className="flex items-center gap-3"><img src="/sibuktamu-icon-192.png?v=3" alt="" className="size-11 rounded-xl"/><div className="min-w-0 flex-1"><p className="font-bold text-sky-950">Aplikasi SIBUKTAMU</p><p className="text-sm text-slate-600">{push?"Notifikasi perangkat aktif":"Notifikasi HP belum diaktifkan"}</p></div><Button variant="outline" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"Tutup":"Atur"}</Button></div><div className={`${expanded?"grid":"hidden"} mt-4 grid-cols-1 gap-2 sm:flex sm:flex-wrap [&_button]:min-h-11 [&_button]:whitespace-normal`}>
   {!installed&&<Button variant="outline" onClick={async()=>{if(install){try{await install.prompt();const choice=await install.userChoice;setMessage(choice.outcome==='accepted'?'Pemasangan diproses oleh browser. Cari ikon SIBUKTAMU di perangkat Anda.':'Pemasangan dibatalkan. Anda dapat mencoba lagi dari menu browser.');}catch{setMessage('Buka menu browser untuk memasang SIBUKTAMU.');}setInstall(null);}else setMessage(ios?'Di Safari, tekan Bagikan → Tambahkan ke Layar Utama, lalu buka aplikasinya untuk mengaktifkan notifikasi.':'Buka menu browser → Instal aplikasi / Tambahkan ke layar utama. Jika pilihan belum muncul, gunakan Chrome atau Edge terbaru.');}}><Download/>Instal SIBUKTAMU</Button>}
   <Button variant="outline" onClick={toggleSound}>{sound?<Volume2/>:<VolumeX/>}{sound?'Matikan suara':'Aktifkan suara'}</Button>
   <Button disabled={busy} onClick={push?disablePush:enablePush}><Bell/>{busy?'Memproses…':push?'Nonaktifkan notifikasi perangkat':'Aktifkan notifikasi perangkat'}</Button>
   {push&&<><Button variant="outline" disabled={busy} onClick={testPush}>Uji kiriman server</Button><Button variant="outline" disabled={busy} onClick={testDisplay}>Uji tampilan HP</Button><Button variant="outline" disabled={busy} onClick={repairPush}>Perbarui koneksi notifikasi</Button></>}
   <p className="basis-full text-sm text-slate-600">Notifikasi HP bekerja saat aplikasi ditutup setelah izin diberikan. Bunyi mengikuti pengaturan notifikasi HP; tombol suara hanya untuk dashboard yang terbuka.</p>
  </div>{!push&&<Button className="mt-3 w-full sm:w-auto" disabled={busy} onClick={enablePush}><Bell/>Aktifkan notifikasi HP</Button>}<p className="mt-2 text-sm text-slate-600">{installed?'Aplikasi terpasang. ':''}Login tetap tersimpan saat aplikasi ditutup. Gunakan Keluar jika perangkat dipakai orang lain.</p>
  {message&&<p role="status" className="mt-2 text-sm text-sky-800">{message}</p>}
  {alert&&<div role="status" className="mt-3 flex items-center gap-3 rounded-xl bg-sky-50 p-3"><Bell className="shrink-0 text-sky-700"/><div className="min-w-0 flex-1"><p className="font-bold">{alert.eventType==='COMPLETED'?'Layanan selesai':'Tamu baru datang'}</p><p className="text-sm">{alert.visitorName}</p></div><Button asChild size="sm"><Link href={`/admin/kunjungan/${encodeURIComponent(alert.visitId)}`}>Lihat tamu</Link></Button><Button variant="ghost" size="icon" aria-label="Tutup pemberitahuan" onClick={()=>setAlert(null)}><X/></Button></div>}
 </section>;
}
