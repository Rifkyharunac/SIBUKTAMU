"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
export function DeleteMasterButton({name,onDelete}:{name:string;onDelete:()=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 return <AlertDialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><AlertDialogTrigger asChild><Button size="sm" variant="destructive">Hapus</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus {name}?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus dari daftar pengelolaan dan tidak dapat digunakan kembali. Riwayat kunjungan serta laporan lama tetap disimpan. Tindakan ini tidak dapat dibatalkan dari aplikasi.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={async()=>{setBusy(true);try{if(await onDelete())setOpen(false);}finally{setBusy(false);}}}>{busy?'Menghapus…':'Ya, hapus'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
