/* Admin-only scope. Never cache authenticated pages or visitor records. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function notificationUrl(value) {
 try {
  const url=new URL(value,self.location.origin);
  if(url.origin===self.location.origin && /^\/admin\/kunjungan\/[^/]+$/.test(url.pathname))return url.pathname;
 }catch{}
 return '/admin/notifikasi';
}
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  await self.registration.showNotification(data.title||'Pemberitahuan SIBUKTAMU',{
   body:typeof data.body==='string'?data.body:'Buka SIBUKTAMU untuk melihat rincian kunjungan.',icon:'/sibuktamu-icon-192.png',badge:'/sibuktamu-icon-192.png',
   silent:false,vibrate:[200,100,200],renotify:true,
   tag:typeof data.tag==='string'?data.tag:'sibuktamu',data:{url:notificationUrl(data.url)}
  });
  // A closed/stale client must never prevent the system notification.
  try {
   const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
   for(const w of windows)try{w.postMessage({type:'SIBUKTAMU_REFRESH',tag:data.tag});}catch{}
  }catch{}
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=notificationUrl(event.notification.data?.url);
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const w of windows)if(new URL(w.url).pathname.startsWith('/admin/')){
   try{const navigated=await w.navigate(url);if(navigated)return await navigated.focus();}catch{}
  }
  return self.clients.openWindow(url);
 })());
});
self.addEventListener('message',event=>{if(event.data?.type==='CLEAR_NOTIFICATIONS')event.waitUntil(self.registration.getNotifications().then(items=>items.forEach(n=>n.close())));});
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate'&&new URL(event.request.url).pathname.startsWith('/admin'))event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SIBUKTAMU</title><body style="font:18px system-ui;padding:32px;background:#f0f9ff;color:#0c4a6e"><h1>Belum tersambung internet</h1><p>Login Anda tetap tersimpan. Sambungkan internet untuk melihat data terbaru.</p><button onclick="location.reload()">Coba lagi</button></body></html>',{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})));
});
