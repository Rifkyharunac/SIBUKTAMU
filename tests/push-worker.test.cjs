const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function worker(clients={}) {
 const handlers={},shown=[],opened=[];
 const self={location:{origin:'https://example.test'},addEventListener:(k,v)=>handlers[k]=v,
  clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url),...clients},
  registration:{showNotification:async(...a)=>shown.push(a)}};
 vm.runInNewContext(fs.readFileSync('public/admin/sw.js','utf8'),{self,URL,Response,fetch});
 return {shown,opened,async fire(type,data){let pending;handlers[type]({...data,waitUntil:p=>pending=p});await pending;}};
}
for(const visible of [false,true])test(`push displays system notification with ${visible?'visible admin window':'app closed'}`,async()=>{
 const w=worker({matchAll:async()=>visible?[{postMessage:()=>{}}]:[]});
 await w.fire('push',{data:{json:()=>({title:'Tamu baru datang',tag:'visit:ARRIVAL',body:'Ada tamu baru menunggu pelayanan.',url:'/admin/kunjungan/visit-1'})}});
 assert.equal(w.shown.length,1);assert.equal(w.shown[0][0],'Tamu baru datang');
 assert.equal(w.shown[0][1].silent,false);assert.equal(w.shown[0][1].renotify,true);
 assert.equal(w.shown[0][1].data.url,'/admin/kunjungan/visit-1');
 assert.equal(w.shown[0][1].body,'Ada tamu baru menunggu pelayanan.');
});
for(const clients of [{matchAll:async()=>{throw Error('unavailable');}},{matchAll:async()=>[{postMessage:()=>{throw Error('closed');}}]}])test('client refresh failure cannot suppress push notification',async()=>{
 const w=worker(clients);await w.fire('push',{data:{json:()=>({})}});assert.equal(w.shown.length,1);
});
test('malformed push still displays a notification',async()=>{
 const w=worker();await w.fire('push',{data:{json:()=>{throw Error('bad JSON');}}});assert.equal(w.shown.length,1);
});
test('notification click opens the specific visit with app closed',async()=>{
 const w=worker();let closed=false;
 await w.fire('notificationclick',{notification:{close:()=>closed=true,data:{url:'/admin/kunjungan/visit-1'}}});
 assert.equal(closed,true);assert.deepEqual(w.opened,['/admin/kunjungan/visit-1']);
});
test('notification click reuses and focuses existing admin app',async()=>{
 let navigated,focused=false;
 const w=worker({matchAll:async()=>[{url:'https://example.test/admin/dashboard',navigate:async url=>{navigated=url;return {focus:async()=>focused=true};}}]});
 await w.fire('notificationclick',{notification:{close(){},data:{url:'/admin/kunjungan/visit-1'}}});
 assert.equal(navigated,'/admin/kunjungan/visit-1');assert.equal(focused,true);assert.equal(w.opened.length,0);
});
test('failed existing-window navigation falls back to a new window',async()=>{
 const w=worker({matchAll:async()=>[{url:'https://example.test/admin/dashboard',navigate:async()=>null}]});
 await w.fire('notificationclick',{notification:{close(){},data:{url:'/admin/kunjungan/visit-1'}}});
 assert.deepEqual(w.opened,['/admin/kunjungan/visit-1']);
});
for(const url of ['https://evil.test/admin/kunjungan/id','//evil.test/admin/kunjungan/id','/api/auth/logout','/admin/kunjungan/../../api/auth/logout'])test(`unsafe click URL falls back: ${url}`,async()=>{
 const w=worker();await w.fire('notificationclick',{notification:{close(){},data:{url}}});assert.deepEqual(w.opened,['/admin/notifikasi']);
});
