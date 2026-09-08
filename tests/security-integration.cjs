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
 await assert.rejects(()=>boundedJsonRequest(request('visits',{text:'a'.repeat(500)}),100),/BODY_TOO_LARGE/);
 console.log('PASS cross-origin and oversized requests blocked');
 let res=await route('public/catalog').GET();assert.equal(res.status,200);const catalog=await res.json();assert.ok(!('whatsappNumber' in catalog.services[0]));
 res=await route('admin/export').GET(request('admin/export'));assert.equal(res.status,401);console.log('PASS public catalog privacy and export authentication');
 res=await route('auth/login').POST(request('auth/login',{username:'testadmin',password:env.INITIAL_ADMIN_PASSWORD}));assert.equal(res.status,200,await res.clone().text());cookie=res.headers.get('set-cookie').split(';')[0];const oldCookie=cookie;
 res=await route('auth/change-password').POST(request('auth/change-password',{currentPassword:env.INITIAL_ADMIN_PASSWORD,newPassword:'NewLocalTestOnly9Password',confirmPassword:'NewLocalTestOnly9Password'}));assert.equal(res.status,200,await res.clone().text());cookie=res.headers.get('set-cookie').split(';')[0];const newCookie=cookie;assert.notEqual(cookie,oldCookie);
 cookie=oldCookie;res=await route('admin/export').GET(request('admin/export'));assert.equal(res.status,401);cookie=newCookie;console.log('PASS internal login and password session revocation');
 const signature='data:image/png;base64,'+fs.readFileSync(root+'/public/logo-sulteng-small.png').toString('base64');
 res=await route('visits').POST(request('visits',{visitorName:'Test Visitor',visitorType:'Pribadi / Masyarakat',phone:'081234567890',serviceId:catalog.services[0].id,signature,consent:true}));assert.equal(res.status,201,await res.clone().text());const visit=(await res.json()).visit;assert.equal(visit.checkoutToken.length,64);assert.equal(res.headers.get('X-Notification-Id')?.length,36);console.log('PASS submission SQL, token creation and notification queue');
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode}));assert.equal(res.status,403);
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:'f'.repeat(64)}));assert.equal(res.status,403);
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:visit.checkoutToken}));assert.equal(res.status,200,await res.clone().text());
 res=await route('checkout').POST(request('checkout',{visitCode:visit.visitCode,token:visit.checkoutToken}));assert.equal((await res.json()).alreadyCompleted,true);console.log('PASS private checkout and repeated completion');
 res=await route('admin/export').GET(request('admin/export?format=pdf'));assert.equal(res.status,200);assert.ok((await res.arrayBuffer()).byteLength>1000);
 res=await route('admin/export').GET(request('admin/export?format=xlsx'));assert.equal(res.status,200);assert.ok((await res.arrayBuffer()).byteLength>1000);console.log('PASS authenticated PDF and Excel export');
 const row=sql.prepare('SELECT id FROM visits LIMIT 1').get();
 for(let i=0;i<125;i++) sql.prepare("INSERT INTO whatsapp_notification_logs (id,visit_id,message,status) VALUES (?,?,?,'NOT_CONFIGURED')").run('notice-'+i,row.id,'Local test');
 res=await route('admin/action').POST(request('admin/action',{action:'MARK_ALL_NOTIFICATIONS_READ'}));assert.equal(res.status,200,await res.clone().text());assert.equal(sql.prepare('SELECT COUNT(*) n FROM whatsapp_notification_logs WHERE is_read=0').get().n,0);console.log('PASS marking more than 100 notifications read');
 sql.prepare("UPDATE users SET role_id='role-viewer' WHERE id=(SELECT user_id FROM admin_credentials WHERE username='testadmin')").run();
 res=await route('admin/signature').GET(request('admin/signature?key=signatures/test'));assert.equal(res.status,403);
 res=await route('admin/overview').GET(request('admin/overview'));assert.equal(res.status,200);const data=await res.json();assert.equal(data.notifications.length,0);assert.ok(data.visits.every(v=>!v.signaturePath&&v.phone.includes('****')));console.log('PASS viewer restrictions');
 sql.prepare("UPDATE users SET role_id='role-department',department_id=NULL WHERE id=(SELECT user_id FROM admin_credentials WHERE username='testadmin')").run();res=await route('admin/export').GET(request('admin/export'));assert.equal(res.status,403);console.log('PASS missing department fails closed');
 const {rateLimit}=require(root+'/lib/rate-limit.ts');for(let i=0;i<3;i++)await rateLimit(request('auth/login'),'test',3,900);res=await rateLimit(request('auth/login'),'test',3,900);assert.equal(res.status,429);console.log('PASS atomic request rate limit');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>sql.close());
