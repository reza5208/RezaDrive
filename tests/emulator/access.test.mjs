import {test} from 'node:test';import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';import {getDatabase,connectDatabaseEmulator,ref,set,get} from 'firebase/database';
if(!process.env.GCLOUD_PROJECT?.startsWith('demo-')||!/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''))throw Error('Loopback demo emulator required');
const apps=[];function db(name,uid,verified=true){const app=initializeApp({apiKey:'emulator-only',projectId:'demo-rezadrive-sync',databaseURL:'https://demo-rezadrive-sync-default-rtdb.firebaseio.com'},name);apps.push(app);const d=getDatabase(app);connectDatabaseEmulator(d,'127.0.0.1',Number(process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(':')[1]),uid?{mockUserToken:{sub:uid,email_verified:verified}}:{});return d;}
const sid='77777777-7777-4777-8777-777777777777',p='rezadrive/users/access-owner/records/'+sid;
test('rules isolate owners, anonymous and unverified clients; validate service envelope',async()=>{try{
 const a=db('access-a','access-owner'),b=db('access-b','another-owner'),anon=db('access-anon'),unverified=db('access-unverified','access-owner',false);
 const valid={kind:'service',payload:JSON.stringify({label:'Test oil',odo:10}),deleted:false,version:1,updatedAt:new Date().toISOString()};
 await set(ref(a,p),valid);assert.equal((await get(ref(a,p))).child('kind').val(),'service');
 for(const d of [b,anon,unverified]){await assert.rejects(get(ref(d,p)),/permission|denied/i);await assert.rejects(set(ref(d,p),{...valid,version:2}),/permission|denied/i);}
 await assert.rejects(set(ref(a,p),{...valid,version:2,unexpected:true}),/permission|denied/i);
 await assert.rejects(set(ref(a,p),{...valid,version:5}),/permission|denied/i);
 }finally{await Promise.all(apps.map(deleteApp));}});
