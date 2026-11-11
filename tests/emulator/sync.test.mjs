import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getDatabase,connectDatabaseEmulator,ref,set,get,runTransaction} from 'firebase/database';
import {planWrite,wireRecord,VERSION_CONFLICT} from '../../lib/sync-operation.ts';
if(!process.env.FIREBASE_DATABASE_EMULATOR_HOST)throw Error('Run only with Firebase Database Emulator.');
const host=process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(':');
const apps=[];
function client(name,uid='driver-a'){
 const app=initializeApp({apiKey:'emulator-only',projectId:'demo-rezadrive-sync',databaseURL:'https://demo-rezadrive-sync-default-rtdb.firebaseio.com'},name);apps.push(app);
 const db=getDatabase(app);connectDatabaseEmulator(db,host[0],Number(host[1]),{mockUserToken:{sub:uid,email_verified:true,email:uid+'@example.test'}});return db;
}
const sid='11111111-1111-4111-8111-111111111111',eid='22222222-2222-4222-8222-222222222222';
const stamp='2026-11-11T14:00:00.000Z';
const start={id:sid,kind:'session',version:0,data:{startAt:stamp,startOdo:100,endAt:null,endOdo:null,note:''}};
const end={...start,version:1,data:{...start.data,endAt:'2026-11-11T15:00:00.000Z',endOdo:110}};
const path='rezadrive/users/driver-a/records';
test('RTDB cold-cache edit, sibling preservation, retry and isolation',async()=>{
 try{
  const first=client('seed');await set(ref(first,path),{[sid]:wireRecord(start,stamp),[eid]:wireRecord({id:eid,kind:'expense',version:0,data:{amount:2.5,sessionId:sid}},stamp)});
  const cold=client('cold-edit'),target=ref(cold,path);let callbacks=0,sawNull=false,reason='';
  const result=await runTransaction(target,all=>{callbacks++;if(all===null)sawNull=true;const plan=planWrite(all,end,stamp);reason=plan.reason||'';return plan.records;},{applyLocally:false});
  assert.equal(result.committed,true,reason);assert.equal(result.snapshot.child(sid+'/version').val(),2);assert.equal(result.snapshot.child(eid+'/payload').val(),JSON.stringify({amount:2.5,sessionId:sid}));
  console.log('Cold transaction callbacks:',callbacks,'initial cache null:',sawNull);
  const retry=await runTransaction(target,all=>planWrite(all,end,stamp).records,{applyLocally:false});assert.equal(retry.committed,true);assert.equal(retry.snapshot.child(sid+'/version').val(),2);
  const stale={...end,data:{...end.data,endOdo:999}};let conflict='';const rejected=await runTransaction(target,all=>{const p=planWrite(all,stale,stamp);conflict=p.reason||'';return p.records;},{applyLocally:false});assert.equal(rejected.committed,false);assert.equal(conflict,VERSION_CONFLICT);
  const b=client('other-user','driver-b');await assert.rejects(get(ref(b,path)),/permission|denied/i);
 }finally{await Promise.all(apps.map(a=>deleteApp(a)));}
});
