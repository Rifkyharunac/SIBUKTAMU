const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
for(const visible of [false,true])test(`push displays a system notification with ${visible?'visible admin window':'app closed'}`,async()=>{
 const handlers={},shown=[];let pending;
 const self={addEventListener:(k,v)=>handlers[k]=v,clients:{matchAll:async()=>visible?[{url:'https://example.test/admin/dashboard',visibilityState:'visible',postMessage:()=>{}}]:[]},registration:{showNotification:async(...a)=>shown.push(a)}};
 vm.runInNewContext(fs.readFileSync('public/admin/sw.js','utf8'),{self,URL,Response,fetch});
 handlers.push({data:{json:()=>({title:'Tamu baru datang',tag:'visit:ARRIVAL'})},waitUntil:p=>pending=p});await pending;
 assert.equal(shown.length,1);assert.equal(shown[0][0],'Tamu baru datang');assert.equal(shown[0][1].silent,false);assert.equal(shown[0][1].renotify,true);assert.equal(shown[0][1].data.url,'/admin/notifikasi');
});
