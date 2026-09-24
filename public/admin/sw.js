/* Admin-only scope. Never cache authenticated pages or visitor records. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const visible=windows.filter(w=>new URL(w.url).pathname.startsWith('/admin')&&w.visibilityState==='visible');
  for(const w of windows)w.postMessage({type:'SIBUKTAMU_REFRESH'});
  if(visible.length)return;
  await self.registration.showNotification(data.title||'Pemberitahuan SIBUKTAMU',{
   body:'Buka SIBUKTAMU untuk melihat rincian kunjungan.',icon:'/sibuktamu-icon-192.png',badge:'/sibuktamu-icon-192.png',
   tag:typeof data.tag==='string'?data.tag:'sibuktamu',data:{url:'/admin/notifikasi'}
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const w of windows)if(new URL(w.url).pathname.startsWith('/admin')){await w.navigate('/admin/notifikasi');return w.focus();}
  return self.clients.openWindow('/admin/notifikasi');
 })());
});
self.addEventListener('message',event=>{if(event.data?.type==='CLEAR_NOTIFICATIONS')event.waitUntil(self.registration.getNotifications().then(items=>items.forEach(n=>n.close())));});
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate'&&new URL(event.request.url).pathname.startsWith('/admin'))event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SIBUKTAMU</title><body style="font:18px system-ui;padding:32px;background:#f0f9ff;color:#0c4a6e"><h1>Belum tersambung internet</h1><p>Login Anda tetap tersimpan. Sambungkan internet untuk melihat data terbaru.</p><button onclick="location.reload()">Coba lagi</button></body></html>',{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})));
});
