// Runs the actual route handlers with an isolated in-memory SQLite D1 adapter.
const {DatabaseSync}=require('node:sqlite');
const Module=require('node:module'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),sql=new DatabaseSync(':memory:');
for(const name of fs.readdirSync(root+'/drizzle').filter(v=>v.endsWith('.sql')).sort())sql.exec(fs.readFileSync(root+'/drizzle/'+name,'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{
 constructor(query,params=[]){this.query=query;this.params=params;}
 bind(...params){return new Statement(this.query,params);}
 async all(){const stmt=sql.prepare(this.query);const results=stmt.all(...this.params);return {results,success:true,meta:{changes:sql.prepare('SELECT changes() n').get().n}};}
 async raw(){const stmt=sql.prepare(this.query);stmt.setReturnArrays(true);return stmt.all(...this.params);}
 async first(column){const value=sql.prepare(this.query).get(...this.params);return column?value?.[column]:value||null;}
 async run(){const info=sql.prepare(this.query).run(...this.params);return {success:true,results:[],meta:{changes:Number(info.changes),last_row_id:Number(info.lastInsertRowid)}};}
}
const objects=new Map();let cookie='';
const env={DB:{prepare:q=>new Statement(q),batch:async stmts=>{sql.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.all());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}},BUCKET:{put:async(k,v)=>objects.set(k,v),delete:async k=>objects.delete(k),get:async k=>objects.has(k)?{body:objects.get(k),httpMetadata:{contentType:'image/png'}}:null},INITIAL_ADMIN_USERNAME:'testadmin',INITIAL_ADMIN_PASSWORD:'LocalTestOnly8Password',INITIAL_ADMIN_EMAIL:'test@example.invalid',INITIAL_ADMIN_NAME:'Test Admin'};
const native=Module._load;
Module._load=function(name,parent,isMain){
 if(name==='cloudflare:workers')return {env};
 if(name==='next/headers')return {cookies:async()=>({get:()=>cookie?{value:cookie.split('=')[1]}:undefined})};
 if(name.startsWith('@/'))name=path.join(root,name.slice(2));
 return native.call(this,name,parent,isMain);
};
require.extensions['.ts']=function(module,filename){module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);};
const route=(file)=>require(root+'/app/api/'+file+'/route.ts');
const request=(pathname,body,headers={})=>new Request('https://example.test/api/'+pathname,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json',origin:'https://example.test'}:{}),'cf-connecting-ip':'192.0.2.1',...headers},...(body?{body:JSON.stringify(body)}:{})});
(async()=>{
 const {rejectUnsafeRequest,boundedJsonRequest}=require(root+'/lib/http-security.ts');
 assert.equal(rejectUnsafeRequest(request('visits',{}, {origin:'https://attacker.test'})).status,403);
 assert.equal(rejectUnsafeRequest(request('visits',{})),null);
 const logoutRequest=(headers={})=>new Request('https://example.test/api/auth/logout',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',origin:'null','sec-fetch-site':'same-origin','sec-fetch-mode':'navigate',...headers}});
 assert.equal(rejectUnsafeRequest(logoutRequest()),null,'real browser form under no-referrer must be accepted');
 for(const site of ['cross-site','same-site','none','']) assert.equal(rejectUnsafeRequest(logoutRequest({'sec-fetch-site':site})).status,403);
 assert.equal(rejectUnsafeRequest(logoutRequest({origin:'https://attacker.test'})).status,403);
 assert.equal(rejectUnsafeRequest(request('auth/logout',{}, {'sec-fetch-site':'same-origin'})),null);
 assert.equal(rejectUnsafeRequest(request('visits',{}, {'content-type':'text/plain'})).status,415);
 await assert.rejects(()=>boundedJsonRequest(request('visits',{text:'a'.repeat(500)}),100),/BODY_TOO_LARGE/);
 console.log('PASS cross-origin and oversized requests blocked');
 const {apiRequest,readApiJson,ApiError}=require(root+'/lib/api-client.ts');
 for(const body of ['', '<html>Gateway error</html>', 'null', '[]']) await assert.rejects(()=>readApiJson(new Response(body)),e=>e instanceof ApiError&&!e.message.includes('JSON'));
 await assert.rejects(()=>readApiJson(Response.json({error:'Akses ditolak'},{status:403})),e=>e.status===403&&e.message==='Akses ditolak');
 const realFetch=global.fetch;
 try { global.fetch=async()=>{throw new TypeError('Failed to fetch')};await assert.rejects(()=>apiRequest('/api/admin/action'),e=>e.status===0&&e.message.includes('Koneksi')); }
 finally {global.fetch=realFetch;}
 console.log('PASS empty/HTML API responses and offline errors handled');
 let res=await route('public/catalog').GET();assert.equal(res.status,200);const catalog=await res.json();assert.ok(!('whatsappNumber' in catalog.services[0]));
 assert.equal(catalog.departments.length,9);assert.equal(catalog.services.length,36);
 assert.equal(catalog.departments.at(-1).name,'Sekretariat Dinas');
 for(const department of catalog.departments){const items=catalog.services.filter(service=>service.departmentId===department.id);assert.equal(items.filter(service=>service.name.startsWith('Lainnya')).length,1);for(const service of items)assert.equal(service.requiresPurpose,service.name.startsWith('Lainnya'));}

 res=await route('admin/export').GET(request('admin/export'));assert.equal(res.status,401);console.log('PASS public catalog privacy and export authentication');
 res=await route('auth/login').POST(request('auth/login',{username:'testadmin',password:env.INITIAL_ADMIN_PASSWORD}));assert.equal(res.status,200,await res.clone().text());cookie=res.headers.get('set-cookie').split(';')[0];const oldCookie=cookie;
 res=await route('auth/change-password').POST(request('auth/change-password',{currentPassword:env.INITIAL_ADMIN_PASSWORD,newPassword:'NewLocalTestOnly9Password',confirmPassword:'NewLocalTestOnly9Password'}));assert.equal(res.status,200,await res.clone().text());cookie=res.headers.get('set-cookie').split(';')[0];const newCookie=cookie;assert.notEqual(cookie,oldCookie);
 cookie=oldCookie;res=await route('admin/export').GET(request('admin/export'));assert.equal(res.status,401);cookie=newCookie;console.log('PASS internal login and password session revocation');
 const signature='data:image/png;base64,'+fs.readFileSync(root+'/public/logo-sulteng-small.png').toString('base64');
 const otherService=catalog.services.find(service=>service.id==='svc-lain-tujuan');assert.ok(otherService);assert.equal(otherService.departmentId,'dept-penerima-tamu');
 const directService=catalog.services.find(service=>service.id==='svc-tujuan-p5tk');
 res=await route('visits').POST(request('visits',{visitorName:'Test Visitor',visitorType:'Pribadi / Masyarakat',phone:'081234567899',serviceId:directService.id,signature,consent:true}));assert.equal(res.status,201,await res.clone().text());assert.equal((await res.json()).visit.serviceName,directService.name);
 res=await route('visits').POST(request('visits',{visitorName:'Test Visitor',visitorType:'Pribadi / Masyarakat',phone:'081234567890',serviceId:otherService.id,signature,consent:true}));assert.equal(res.status,422);assert.match((await res.json()).error,/keperluan/i);
 const customPurpose='Konsultasi program kerja sama pelatihan untuk masyarakat';
 res=await route('visits').POST(request('visits',{visitorName:'Test Visitor',visitorType:'Pribadi / Masyarakat',phone:'081234567890',serviceId:otherService.id,purpose:customPurpose,signature,consent:true}));assert.equal(res.status,201,await res.clone().text());const visit=(await res.json()).visit;assert.equal(visit.checkoutToken.length,64);assert.equal(visit.serviceName,customPurpose);assert.equal(sql.prepare('SELECT purpose FROM visits WHERE visit_code=?').get(visit.visitCode).purpose,customPurpose);assert.equal(res.headers.get('X-Notification-Visit-Id')?.length,36);console.log('PASS official catalog, custom purpose submission and notification queue');
 const {deliverWhatsApp}=require(root+'/lib/whatsapp-provider.ts');
 const waEnv={WHATSAPP_PROVIDER:'waha',WAHA_API_URL:'https://waha.example.test',WAHA_API_KEY:'local-test-key',WAHA_SESSION:'default'};
 let captured;
 const accepted=await deliverWhatsApp(waEnv,'085214900540','Local test',async(url,init)=>{if(url.endsWith('/me'))return Response.json({id:'628111111111@c.us'});captured={url,init};return Response.json({id:'waha-test-message'});});
 assert.equal(accepted.status,'ACCEPTED');assert.equal(captured.url,'https://waha.example.test/api/sendText');assert.equal(captured.init.headers['X-Api-Key'],'local-test-key');assert.equal(captured.init.headers.Authorization,undefined);assert.equal(JSON.parse(captured.init.body).chatId,'6285214900540@c.us');assert.equal(captured.init.redirect,'manual');
 await assert.rejects(()=>deliverWhatsApp({...waEnv,WAHA_API_URL:'http://waha.example.test'},'085214900540','test'),/HTTPS/);
 await assert.rejects(()=>deliverWhatsApp(waEnv,'085214900540','test',async()=>Response.json({},{status:401})),/API key/);
 await assert.rejects(()=>deliverWhatsApp(waEnv,'085214900540','test',async(url)=>Response.json(url.endsWith('/me')?{id:'628111111111@c.us'}:{})),/ID pesan/);
 await assert.rejects(()=>deliverWhatsApp(waEnv,'085214900540','test',async()=>new Response('<html>private gateway text</html>')),/Respons penyedia tidak valid/);
 await assert.rejects(()=>deliverWhatsApp(waEnv,'085214900540','test',async()=>{throw new TypeError('offline')}),/offline/);
 const notificationId=sql.prepare('SELECT id FROM whatsapp_notification_logs WHERE visit_id=?').get(visit.id).id;
 sql.prepare("UPDATE whatsapp_notification_logs SET status='QUEUED', recipient=? WHERE id=?").run('085214900540',notificationId);
 const savedFetch=global.fetch;Object.assign(env,waEnv);
 try {
   global.fetch=async(url)=>Response.json(url.endsWith('/me')?{id:'628111111111@c.us'}:{id:{_serialized:'waha-persisted-id'}});
   await require(root+'/lib/whatsapp.ts').dispatchQueuedNotification(notificationId);
   const log=sql.prepare('SELECT status,provider_message_id,sent_at FROM whatsapp_notification_logs WHERE id=?').get(notificationId);
   assert.equal(log.status,'ACCEPTED');assert.equal(log.provider_message_id,'waha-persisted-id');assert.equal(log.sent_at,null);
   const retry=await route('admin/action').POST(request('admin/action',{action:'RETRY_WHATSAPP',id:notificationId}));assert.equal(retry.status,409);
 }finally{global.fetch=savedFetch;for(const key of Object.keys(waEnv))delete env[key];}
 console.log('PASS WAHA simulated API, normalization, HTTPS, authentication errors, missing ID and accepted status');
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode}));assert.equal(res.status,403);
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:'f'.repeat(64)}));assert.equal(res.status,403);
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:visit.checkoutToken}));assert.equal(res.status,200,await res.clone().text());
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:visit.checkoutToken}));assert.equal((await res.json()).alreadyCompleted,true);console.log('PASS private checkout and repeated completion');
 // All eligible accounts, normalized once; unrelated/inactive users must not receive guest data.
 sql.prepare("UPDATE users SET whatsapp_number='081111111112' WHERE role_id='role-super'").run();
 const addAdmin=sql.prepare('INSERT INTO users (id,name,email,role_id,department_id,whatsapp_number,is_active) VALUES (?,?,?,?,?,?,?)');
 addAdmin.run('field1','Field1','field1@example.invalid','role-department',directService.departmentId,'081111111113',1);
 addAdmin.run('field2','Field2','field2@example.invalid','role-department',directService.departmentId,'+6281111111113',1);
 addAdmin.run('otherfield','Other','other@example.invalid','role-department','dept-hiwas','081111111114',1);
 addAdmin.run('inactive','Inactive','inactive@example.invalid','role-department',directService.departmentId,'081111111115',0);
 const routed=await route('visits').POST(request('visits',{visitorName:'Routing Test',visitorType:'Pribadi / Masyarakat',phone:'081234567877',serviceId:directService.id,signature,consent:true}));
 assert.equal(routed.status,201,await routed.clone().text()); const routedVisit=(await routed.json()).visit;
 assert.deepEqual(sql.prepare('SELECT recipient FROM whatsapp_notification_logs WHERE visit_id=? ORDER BY recipient').all(routedVisit.id).map(r=>r.recipient),['6281111111112','6281111111113','6281111111114']);
 const realTransport=global.fetch;Object.assign(env,waEnv);const delivered=[];
 try {
   global.fetch=async(url,init)=>{if(url.endsWith('/me'))return Response.json({id:'628111111111@c.us'});delivered.push(JSON.parse(init.body).chatId);return Response.json({id:'message-'+delivered.length});};
   const {dispatchVisitNotifications}=require(root+'/lib/whatsapp.ts');
   await Promise.all([dispatchVisitNotifications(routedVisit.id),dispatchVisitNotifications(routedVisit.id)]);
   assert.deepEqual(delivered.sort(),['6281111111112@c.us','6281111111113@c.us','6281111111114@c.us']);
 }finally{global.fetch=realTransport;for(const key of Object.keys(waEnv))delete env[key];}
 console.log('PASS multi-admin routing, all departments included, inactive exclusion, deduplication and concurrent dispatch');
 res=await route('admin/export').GET(request('admin/export?format=pdf'));assert.equal(res.status,200);assert.ok((await res.arrayBuffer()).byteLength>1000);
 res=await route('admin/export').GET(request('admin/export?format=xlsx'));assert.equal(res.status,200);assert.ok((await res.arrayBuffer()).byteLength>1000);console.log('PASS authenticated PDF and Excel export');
 const row={id:visit.id};
 for(let i=0;i<125;i++) sql.prepare("INSERT INTO whatsapp_notification_logs (id,visit_id,message,status) VALUES (?,?,?,'NOT_CONFIGURED')").run('notice-'+i,row.id,'Local test');
 res=await route('admin/action').POST(request('admin/action',{action:'MARK_ALL_NOTIFICATIONS_READ'}));assert.equal(res.status,200,await res.clone().text());assert.equal(sql.prepare('SELECT COUNT(*) n FROM whatsapp_notification_logs WHERE is_read=0').get().n,0);console.log('PASS marking more than 100 notifications read');
 const adminAction=async payload=>{const r=await route('admin/action').POST(request('admin/action',payload));assert.equal(r.status,200,await r.clone().text());return r.json();};
 const department=await adminAction({action:'SAVE_DEPARTMENT',code:'TEST',name:'Test Department'});
 await adminAction({action:'SAVE_DEPARTMENT',id:department.id,code:'TEST',name:'Updated Department'});
 const service=await adminAction({action:'SAVE_SERVICE',departmentId:department.id,name:'Test Service'});
 await adminAction({action:'SAVE_SERVICE',id:service.id,departmentId:department.id,name:'Updated Service',isActive:false});
 const employee=await adminAction({action:'SAVE_EMPLOYEE',departmentId:department.id,name:'Test Employee'});
 await adminAction({action:'SAVE_EMPLOYEE',id:employee.id,departmentId:department.id,name:'Test Employee',isActive:false});
 await adminAction({action:'SAVE_SETTING',key:'report_signer_title',value:'Kepala Dinas'});
 assert.equal(sql.prepare('SELECT name FROM departments WHERE id=?').get(department.id).name,'Updated Department');
 assert.equal(sql.prepare('SELECT is_active FROM services WHERE id=?').get(service.id).is_active,0);
 res=await route('public/catalog').GET();assert.ok(!(await res.json()).services.some(v=>v.id===service.id));
 res=await route('admin/action').POST(request('admin/action',{action:'UPDATE_VISIT_STATUS',visitId:row.id,status:'MENUNGGU'}));assert.equal(res.status,422,'completed visits cannot reopen');
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:visit.checkoutToken,rating:4,feedback:'Test feedback'}));assert.equal(res.status,200);
 await adminAction({action:'ARCHIVE_NOTIFICATION',id:'notice-0',archived:true});
 assert.ok(sql.prepare('SELECT archived_at FROM whatsapp_notification_logs WHERE id=?').get('notice-0').archived_at);
 await adminAction({action:'ARCHIVE_NOTIFICATION',id:'notice-0',archived:false});
 await adminAction({action:'DELETE_NOTIFICATION',id:'notice-0'});
 await adminAction({action:'DELETE_READ_NOTIFICATIONS'});
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM whatsapp_notification_logs').get().n,0);
 assert.ok(sql.prepare('SELECT id FROM visits WHERE id=?').get(row.id),'notification cleanup preserves guest data');
 console.log('PASS master data updates, inactive catalog, settings, terminal status, survey and notification archive/delete');
 sql.prepare("UPDATE users SET role_id='role-viewer' WHERE id=(SELECT user_id FROM admin_credentials WHERE username='testadmin')").run();
 res=await route('admin/signature').GET(request('admin/signature?key=signatures/test'));assert.equal(res.status,403);
 res=await route('admin/overview').GET(request('admin/overview'));assert.equal(res.status,200);const data=await res.json();assert.equal(data.notifications.length,0);assert.equal(data.visits.length,3);assert.ok(data.visits.every(v=>!v.signaturePath&&v.phone.includes('****')));console.log('PASS viewer restrictions');
 sql.prepare("UPDATE users SET role_id='role-department',department_id=NULL WHERE id=(SELECT user_id FROM admin_credentials WHERE username='testadmin')").run();res=await route('admin/export').GET(request('admin/export'));assert.equal(res.status,200);
 res=await route('admin/overview').GET(request('admin/overview'));assert.equal(res.status,200);const unified=await res.json();assert.equal(unified.identity.role,'SUPER_ADMIN');assert.equal(unified.identity.roleLabel,'Admin');assert.equal(unified.visits.length,3);assert.ok(unified.users.length>0);assert.ok(unified.settings.length>0);
 await adminAction({action:'SAVE_SETTING',key:'office_hours',value:'08.00–16.00'});
 console.log('PASS legacy department admin has full overview, exports and settings without department assignment');
 const recipientAccount={action:'SAVE_USER',name:'Notification Admin',email:'notify@example.invalid',username:'notify.admin',temporaryPassword:'TemporaryPassword123',roleId:'role-department',whatsappNumber:'+62 812-3456-7890',isActive:true};
 res=await route('admin/action').POST(request('admin/action',{...recipientAccount,whatsappNumber:'not-a-phone'}));assert.equal(res.status,422);
 assert.equal(sql.prepare('SELECT id FROM users WHERE email=?').get(recipientAccount.email),undefined,'invalid phone must not create an account');
 const savedRecipient=await adminAction(recipientAccount);
 let storedRecipient=sql.prepare('SELECT role_id,whatsapp_number FROM users WHERE id=?').get(savedRecipient.id);
 assert.equal(storedRecipient.role_id,'role-super');assert.equal(storedRecipient.whatsapp_number,'6281234567890');
 await adminAction({...recipientAccount,id:savedRecipient.id,temporaryPassword:'',whatsappNumber:''});
 storedRecipient=sql.prepare('SELECT whatsapp_number FROM users WHERE id=?').get(savedRecipient.id);assert.equal(storedRecipient.whatsapp_number,null);
 console.log('PASS legacy admin manages users, rejects invalid recipient numbers, normalizes valid numbers and allows opting out');
 const {rateLimit}=require(root+'/lib/rate-limit.ts');for(let i=0;i<3;i++)await rateLimit(request('auth/login'),'test',3,900);res=await rateLimit(request('auth/login'),'test',3,900);assert.equal(res.status,429);console.log('PASS atomic request rate limit');
 const auth=require(root+'/lib/admin-auth.ts');
 const user=sql.prepare("SELECT user_id FROM admin_credentials WHERE username='testadmin'").get().user_id;
 sql.prepare("UPDATE users SET role_id='role-super',department_id=NULL WHERE id=?").run(user);
 const other=await auth.createAdminSession(user);
 const current=cookie;
 const before=sql.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n;
 res=route('auth/logout').GET();assert.equal(res.status,303);assert.equal(sql.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n,before);
 const blocked=logoutRequest({origin:'https://attacker.test',cookie:current});
 assert.equal(rejectUnsafeRequest(blocked).status,403);assert.equal(sql.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n,before);
 res=await route('auth/logout').POST(logoutRequest({cookie:current}));assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/admin/login');assert.match(res.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax; Max-Age=0/);
 res=await route('admin/overview').GET(request('admin/overview'));assert.equal(res.status,401,'revoked cookie cannot read dashboard');
 cookie='sibuktamu_session='+other.token;res=await route('admin/overview').GET(request('admin/overview'));assert.equal(res.status,200,'other browser remains signed in');
 res=await route('auth/logout').POST(request('auth/logout',{}, {cookie}));assert.equal((await res.json()).success,true);
 res=await route('auth/logout').POST(request('auth/logout',{}, {cookie}));assert.equal(res.status,200,'logout is idempotent');
 assert.equal(auth.readSessionToken(logoutRequest({cookie:'sibuktamu_session=%broken'})),null);
 res=await route('auth/logout').POST(logoutRequest({cookie:'sibuktamu_session=%broken'}));assert.equal(res.status,303);
 const finalSession=await auth.createAdminSession(user),prepare=env.DB.prepare;
 try { env.DB.prepare=()=>{throw new Error('Database unavailable')};res=await route('auth/logout').POST(request('auth/logout',{}, {cookie:'sibuktamu_session='+finalSession.token}));assert.equal(res.status,503);assert.equal(res.headers.get('set-cookie'),null); }
 finally { env.DB.prepare=prepare; }
 console.log('PASS logout form/JSON, session revocation, repeated logout, malformed cookie and storage failure');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>sql.close());
