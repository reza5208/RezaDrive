import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getDatabase, get, ref, runTransaction, type Database } from 'firebase/database';
import type { Entry } from './model';
export type CloudConfig={enabled:boolean;firebaseConfig:Record<string,string>};
let config:CloudConfig={enabled:false,firebaseConfig:{}},db:Database|null=null;
export async function initializeCloud(observe:(user:User|null)=>void){
 const result=await fetch(import.meta.env.BASE_URL+'cloud-config.json',{cache:'no-store'});
 if(!result.ok)throw Error('Tetapan cloud tidak dapat dibaca. Mod device masih tersedia.');
 config=await result.json();
 if(!config.enabled){observe(null);return ()=>{};}
 if(!config.firebaseConfig?.projectId||!config.firebaseConfig?.apiKey||!config.firebaseConfig?.databaseURL)throw Error('Konfigurasi Firebase belum lengkap.');
 const app=initializeApp(config.firebaseConfig),auth=getAuth(app);db=getDatabase(app);
 return onAuthStateChanged(auth,observe);
}
export const cloudReady=()=>!!db&&config.enabled;
export async function googleSignIn(){
 if(!cloudReady())throw Error('Login Google & sync belum diaktifkan. Konfigurasi Firebase diperlukan. Buat masa ini pilih “Guna pada device ini”.');
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 return signInWithPopup(getAuth(),provider);
}
export async function googleSignOut(){if(cloudReady())await signOut(getAuth());}
function recordsRef(owner:string){
 if(!db||getAuth().currentUser?.uid!==owner)throw Error('Log masuk akaun Google yang betul untuk sync.');
 return ref(db,'rezadrive/users/'+owner+'/records');
}
export async function cloudRead(owner:string):Promise<Entry[]>{
 const snap=await get(recordsRef(owner));const stored=snap.val()||{};
 return Object.entries(stored).map(([id,v]:[string,any])=>({id,kind:v.kind,data:JSON.parse(v.payload),version:v.version,deleted:v.deleted}));
}
export async function cloudWrite(owner:string,op:Entry):Promise<{version:number}>{
 const expected=op.version,next=expected+1,payload=JSON.stringify(op.data);
 let reason='Rekod berubah pada peranti lain. Semak versi awan dahulu.';
 const reference=recordsRef(owner);
 // Warm the SDK cache so edits queued before a reload compare against the
 // server record instead of treating an unpopulated cache as a deletion.
 await get(reference);
 const result=await runTransaction(reference,(all:any)=>{
  // RTDB may first invoke the updater with an empty cache. Returning a proposed
  // value lets the server compare its hash and retry against the actual data.
  const records=all||{},current=records[op.id];
  if(current&&current.version===next&&current.payload===payload&&current.deleted===!!op.deleted&&current.kind===op.kind)return records;
  if((current?.version||0)!==expected||current&&current.kind!==op.kind)return;
  if(!op.deleted&&op.kind==='session'&&!op.data.endAt){
   const active=Object.entries(records).some(([id,r]:[string,any])=>id!==op.id&&r.kind==='session'&&!r.deleted&&!JSON.parse(r.payload).endAt);
   if(active){reason='Ada sesi aktif pada peranti lain. Muat semula sebelum mula sesi baru.';return;}
  }
  records[op.id]={kind:op.kind,payload,version:next,deleted:!!op.deleted,updatedAt:new Date().toISOString()};
  return records;
 },{applyLocally:false});
 if(!result.committed){const e=Object.assign(new Error(reason),{status:409});throw e;}
 return {version:result.snapshot.child(op.id).val().version};
}
export function cloudError(e:any){
 const code=String(e?.code||'');
 if(code.includes('permission-denied')||code.includes('PERMISSION_DENIED'))return 'Akses cloud ditolak. Peraturan keselamatan Firebase untuk RezaDrive perlu disediakan dahulu. Rekod tempatan dikekalkan.';
 if(code.includes('unauthorized-domain'))return 'Domain reza5208.github.io belum dibenarkan dalam Firebase Authentication.';
 if(code.includes('operation-not-allowed'))return 'Login Google belum diaktifkan dalam Firebase Authentication.';
 if(code.includes('popup-blocked'))return 'Popup Google disekat. Buka app dalam Chrome dan benarkan popup.';
 if(code.includes('popup-closed')||code.includes('cancelled-popup'))return 'Login dibatalkan. Hang boleh cuba semula.';
 return e?.message||'Cloud belum dapat disambungkan.';
}
