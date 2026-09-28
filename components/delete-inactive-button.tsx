"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {apiRequest} from '@/lib/api-client';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
export function DeleteInactiveButton({ids,kind,onDone}:{ids:string[];kind:'users'|'services';onDone:()=>void}){
 const [open,setOpen]=useState(false),[snapshot,setSnapshot]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function remove(){setBusy(true);setError('');let deleted=0;try{
  for(let i=0;i<snapshot.length;i+=100){const result=await apiRequest<{deleted:number}>('/api/admin/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:kind==='users'?'DELETE_INACTIVE_USERS':'DELETE_INACTIVE_SERVICES',ids:snapshot.slice(i,i+100),confirmation:'HAPUS SEMUA NONAKTIF'})});deleted+=result.deleted;}
  setMessage(`${deleted} ${kind==='users'?'pengguna':'layanan'} nonaktif dihapus. Data yang sudah aktif kembali tidak dihapus.`);setOpen(false);
 }catch(e){setError(`${deleted} data telah dihapus. ${e instanceof Error?e.message:'Penghapusan belum selesai.'} Anda dapat mencoba kembali.`);}finally{setBusy(false);onDone();}}
 return <div className="mb-4 space-y-2"><AlertDialog open={open} onOpenChange={value=>{if(busy)return;if(value){setSnapshot([...ids]);setError('');}setOpen(value);}}><AlertDialogTrigger asChild><Button variant="destructive" disabled={!ids.length}>Hapus semua nonaktif ({ids.length})</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus {snapshot.length} {kind==='users'?'pengguna':'layanan'} nonaktif?</AlertDialogTitle><AlertDialogDescription>Semua data nonaktif dalam daftar ini akan dihapus dari pengelolaan, termasuk di bidang lain meskipun filter sedang digunakan. Data aktif tidak dihapus. Riwayat kunjungan dan laporan lama tetap tersimpan. Tindakan ini tidak dapat dibatalkan dari aplikasi.</AlertDialogDescription></AlertDialogHeader>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={remove}>{busy?'Menghapus…':'Ya, hapus semua nonaktif'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>{message&&<p role="status" className="text-sm text-slate-600">{message}</p>}</div>;
}
