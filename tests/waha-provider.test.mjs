import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverWhatsApp, verifyWahaSession, WahaError } from '../lib/whatsapp-provider.ts';
const env={WHATSAPP_PROVIDER:'waha',WAHA_API_URL:'https://waha.example.test',WAHA_API_KEY:'secret-sentinel',WAHA_SESSION:'default'};
const identity={id:'628111111111@c.us'};
const send=transport=>deliverWhatsApp(env,'081234567890','guest-data-sentinel',transport);
for(const [status,code] of [[401,'WAHA_AUTH'],[403,'WAHA_AUTH'],[409,'WAHA_SESSION'],[422,'WAHA_SESSION'],[429,'WAHA_RATE_LIMIT'],[500,'WAHA_SERVER'],[503,'WAHA_SERVER'],[502,'WAHA_GATEWAY'],[504,'WAHA_GATEWAY'],[530,'WAHA_GATEWAY']]) {
 test(`verification HTTP ${status}: ${code}, no send or sensitive error`,async()=>{
  let calls=0;
  await assert.rejects(()=>send(async(_url,init)=>{calls++;assert.equal(init.method,'GET');return Response.json({error:'secret-sentinel guest-data-sentinel https://private.example'},{status});}),e=>e instanceof WahaError&&e.code===code&&e.httpStatus===status&&!/sentinel|private\.example/.test(e.message));
  assert.equal(calls,1);
 });
}
test('HTML, tunnel errors and redirects differ from WAHA JSON errors',async()=>{
 for(const response of [new Response('<html>ngrok tunnel offline secret-sentinel</html>',{status:403}),new Response('ERR_NGROK_3200',{status:404}),new Response(null,{status:302,headers:{location:'https://other.example'}}),new Response('<html>Cloudflare Tunnel error 1033</html>',{status:530})]) {
  await assert.rejects(()=>send(async(_url,init)=>{assert.equal(init.redirect,'manual');return response;}),e=>e.code==='WAHA_TUNNEL'&&!e.message.includes('secret-sentinel'));
 }
});
test('network and timeout are sanitized; no fallback or send',async()=>{
 for(const [error,code] of [[new TypeError('secret-sentinel https://private.example'),'WAHA_NETWORK'],[new DOMException('secret-sentinel','TimeoutError'),'WAHA_TIMEOUT']]) {
  let calls=0;await assert.rejects(()=>send(async()=>{calls++;throw error;}),e=>e.code===code&&!/sentinel|private\.example/.test(e.message));assert.equal(calls,1);
 }
});
test('normalize API base and encode session; only one POST after identity check',async()=>{
 const calls=[];
 const result=await deliverWhatsApp({...env,WAHA_API_URL:env.WAHA_API_URL+'/prefix/api///',WAHA_SESSION:'team /one'},'081234567890','hello',async(url,init)=>{
  calls.push(url);assert.equal(init.headers['X-Api-Key'],env.WAHA_API_KEY);assert.equal(init.redirect,'manual');assert.equal(init.headers['ngrok-skip-browser-warning'],'true');
  if(init.method==='GET')return Response.json(identity);
  assert.deepEqual(JSON.parse(init.body),{session:'team /one',chatId:'6281234567890@c.us',text:'hello'});return Response.json({id:{_serialized:'message-1'}});
 });
 assert.deepEqual(calls,[env.WAHA_API_URL+'/prefix/api/sessions/team%20%2Fone/me',env.WAHA_API_URL+'/prefix/api/sendText']);assert.deepEqual(result,{id:'message-1',status:'ACCEPTED'});
});
for(const status of [404,405])test(`missing /me ${status} falls back to verified WORKING session`,async()=>{
 const calls=[];await send(async(url,init)=>{calls.push(url);if(url.endsWith('/me'))return Response.json({message:'not found'},{status});if(init.method==='GET')return Response.json({name:'default',status:'WORKING',me:identity});return Response.json({id:'ok'});});
 assert.deepEqual(calls,[env.WAHA_API_URL+'/api/sessions/default/me',env.WAHA_API_URL+'/api/sessions/default',env.WAHA_API_URL+'/api/sendText']);
});
test('fallback cannot bypass mismatched/stopped session, missing identity or self-send',async()=>{
 for(const info of [{name:'other',status:'WORKING',me:identity},{name:'default',status:'STOPPED',me:identity},{name:'default',status:'WORKING',me:null},{name:'default',status:'WORKING',me:{id:'6281234567890@c.us'}}]) {
  let posts=0;await assert.rejects(()=>send(async(url,init)=>{if(init.method==='POST')posts++;return url.endsWith('/me')?Response.json({},{status:404}):Response.json(info);}));assert.equal(posts,0);
 }
});
test('fallback preserves auth, missing endpoint and server diagnosis',async()=>{
 for(const [status,code] of [[401,'WAHA_AUTH'],[404,'WAHA_ENDPOINT'],[500,'WAHA_SERVER']])await assert.rejects(()=>send(async(url)=>Response.json({},{status:url.endsWith('/me')?404:status})),e=>e.code===code);
});
test('null, malformed, oversized and non-phone identities fail closed',async()=>{
 for(const body of ['null','{}','[]','not json','x'.repeat(65537),JSON.stringify({id:'628111111111@lid'}),JSON.stringify({id:'628111111111'})]) {
  let posts=0;await assert.rejects(()=>send(async(_url,init)=>{if(init.method==='POST')posts++;return new Response(body);}));assert.equal(posts,0);
 }
});
test('verification is read-only and supports device-qualified phone identity',async()=>{
 const result=await verifyWahaSession(env,async(_url,init)=>{assert.equal(init.method,'GET');return Response.json({id:'628111111111:2@s.whatsapp.net'});});assert.equal(result.sender,'628111111111');
});
test('send timeout never retries and warns of uncertain delivery',async()=>{
 let posts=0;await assert.rejects(()=>send(async(_url,init)=>{if(init.method==='GET')return Response.json(identity);posts++;throw new DOMException('timeout','TimeoutError');}),e=>e.code==='WAHA_TIMEOUT'&&e.message.includes('pesan mungkin telah diterima'));assert.equal(posts,1);
});
test('Meta delivery remains independent of WAHA',async()=>{
 let calls=0;const result=await deliverWhatsApp({WHATSAPP_ACCESS_TOKEN:'meta-test',WHATSAPP_PHONE_NUMBER_ID:'123'},'081234567890','hello',async(url,init)=>{calls++;assert.ok(url.endsWith('/123/messages'));assert.equal(init.headers.Authorization,'Bearer meta-test');return Response.json({messages:[{id:'meta-id'}]});});assert.equal(result.id,'meta-id');assert.equal(calls,1);
});
