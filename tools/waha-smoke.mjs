// Sends exactly one test message after confirming the linked WAHA session.
const {WAHA_API_URL,WAHA_API_KEY,WAHA_SESSION='default',WAHA_TEST_RECIPIENT}=process.env;
if(!WAHA_API_URL||!WAHA_API_KEY||!WAHA_TEST_RECIPIENT)throw new Error('Isi WAHA_API_URL, WAHA_API_KEY, dan WAHA_TEST_RECIPIENT di lingkungan server.');
const base=new URL(WAHA_API_URL);
if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new Error('Gunakan URL HTTPS yang aman.');
const phone=WAHA_TEST_RECIPIENT.replace(/\D/g,'').replace(/^0/,'62');
if(!/^[1-9]\d{7,14}$/.test(phone))throw new Error('Nomor penerima tidak valid.');
const headers={'X-Api-Key':WAHA_API_KEY,'Content-Type':'application/json'};
async function call(path,init={}){
 const response=await fetch(base.href.replace(/\/$/,'')+path,{...init,headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`WAHA HTTP ${response.status}; periksa konfigurasi dan sesi.`);
 return response.json();
}
try {
 const session=await call('/api/sessions/'+encodeURIComponent(WAHA_SESSION));
 if(session.status!=='WORKING')throw new Error('Sesi belum WORKING. Hubungkan nomor pengirim melalui QR di dashboard WAHA.');
 const result=await call('/api/sendText',{method:'POST',body:JSON.stringify({session:WAHA_SESSION,chatId:phone+'@c.us',text:'Uji coba SIBUKTAMU: koneksi notifikasi WhatsApp ke admin. Pesan ini tidak berisi data tamu.'})});
 const id=typeof result.id==='string'?result.id:result.id?._serialized;
 if(!id)throw new Error('ID pesan tidak diterima; periksa riwayat sebelum mencoba ulang.');
 console.log('Pesan uji diterima WAHA. Konfirmasikan penerimaan pada HP admin. ID:',id);
}catch {console.error('Uji WAHA belum terkonfirmasi. Periksa URL, kunci, sesi, dan riwayat pesan sebelum mengulang.');process.exitCode=1;}
