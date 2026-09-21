import test from 'node:test';
import assert from 'node:assert/strict';
import { needsPurpose, visitPurpose } from '../lib/guest-purpose.ts';
import { notificationRecipients } from '../lib/notification-recipients.ts';
import { deliverWhatsApp } from '../lib/whatsapp-provider.ts';
test('ordinary selection is sufficient; Other requires typed purpose; confirmation uses complete text',()=>{
 const ordinary={name:'Seksi Penempatan',requiresPurpose:false};
 const other={name:'Lainnya — Bidang',requiresPurpose:false};
 assert.equal(needsPurpose(ordinary),false);assert.equal(needsPurpose(other),true);
 assert.equal(visitPurpose(ordinary,''),'Seksi Penempatan');assert.equal(visitPurpose(other,''),'');
 assert.equal(visitPurpose(other,'  Keperluan lengkap\nBaris kedua  '),'Keperluan lengkap\nBaris kedua');
});
test('all active admins across departments receive notifications with normalized duplicate numbers',()=>{
 const user=(role,departmentId,whatsappNumber,isActive=true)=>({role,departmentId,whatsappNumber,isActive});
 assert.deepEqual(notificationRecipients([
 user('SUPER_ADMIN',null,'081234567890'),user('ADMIN_BIDANG','A','+6281234567890'),
 user('ADMIN_BIDANG','A','081234567891'),user('ADMIN_BIDANG','B','081234567892'),
 user('ADMIN_BIDANG','A','081234567893',false),user('VIEWER','A','081234567894'),
 user('SUPER_ADMIN',null,'invalid')],'A'),['6281234567890','6281234567891','6281234567892']);
});
test('WAHA must never send to its own session account',async()=>{
 let posts=0;const transport=async(url,options)=>{if(options?.method==='POST')posts++;return Response.json({id:'6281234567890@c.us'});};
 await assert.rejects(()=>deliverWhatsApp({WHATSAPP_PROVIDER:'waha',WAHA_API_URL:'https://example.test',WAHA_API_KEY:'test'},'081234567890','test',transport),/sama dengan nomor bot/);
 assert.equal(posts,0);
});
