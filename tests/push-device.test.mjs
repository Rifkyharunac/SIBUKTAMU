import test from 'node:test';
import assert from 'node:assert/strict';
import { syncPushSubscription } from '../lib/push-device.ts';
const key=new Uint8Array([4,1,2,3]);
const publicKey=Buffer.from(key).toString('base64url');
function setup({existing=true,mismatch=false,expired=false,unsubscribe=true,saveFails=false}={}) {
 const calls=[];
 const sub={options:{applicationServerKey:(mismatch?new Uint8Array([4,9,8,7]):key).buffer},expirationTime:expired?Date.now()-1000:null,toJSON:()=>({endpoint:'https://fcm.googleapis.com/test'}),unsubscribe:async()=>{calls.push('unsubscribe');return unsubscribe;}};
 const registration={pushManager:{getSubscription:async()=>existing?sub:null,subscribe:async options=>{calls.push('subscribe');assert.equal(options.userVisibleOnly,true);assert.deepEqual(options.applicationServerKey,key);return sub;}}};
 const save=async()=>{calls.push('save');if(saveFails)throw Error('save failed');};
 return {calls,registration,save};
}
test('valid subscription is saved to the current session without replacing it',async()=>{
 const s=setup();assert.ok(await syncPushSubscription(s.registration,publicKey,s.save));assert.deepEqual(s.calls,['save']);
});
for(const options of [{mismatch:true},{expired:true}])test(`stale subscription is renewed: ${JSON.stringify(options)}`,async()=>{
 const s=setup(options);assert.ok(await syncPushSubscription(s.registration,publicKey,s.save));assert.deepEqual(s.calls,['unsubscribe','subscribe','save']);
});
test('mount does not subscribe a device without an existing opt-in',async()=>{
 const s=setup({existing:false});assert.equal(await syncPushSubscription(s.registration,publicKey,s.save),null);assert.deepEqual(s.calls,[]);
});
test('explicit opt-in creates and saves subscription',async()=>{
 const s=setup({existing:false});assert.ok(await syncPushSubscription(s.registration,publicKey,s.save,true));assert.deepEqual(s.calls,['subscribe','save']);
});
test('failed unsubscribe is surfaced without saving stale keys',async()=>{
 const s=setup({mismatch:true,unsubscribe:false});await assert.rejects(()=>syncPushSubscription(s.registration,publicKey,s.save));assert.deepEqual(s.calls,['unsubscribe']);
});
test('failed server registration is not reported as enabled',async()=>{
 const s=setup({saveFails:true});await assert.rejects(()=>syncPushSubscription(s.registration,publicKey,s.save),/save failed/);
});
