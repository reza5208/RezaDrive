import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getDatabase, get, ref, runTransaction, type Database } from 'firebase/database';
import type { Entry } from './model';
import {planWrite,isAcknowledged,VERSION_CONFLICT,type WireRecords} from './sync-operation';
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
 const reference=recordsRef(owner),updatedAt=new Date().toISOString();
 let reason=VERSION_CONFLICT;
 await get(reference);
 try {
  const result=await runTransaction(reference,(all:WireRecords|null)=>{
   const plan=planWrite(all,op,updatedAt);
   if(plan.reason)reason=plan.reason;
   return plan.records;
  },{applyLocally:false});
  if(!result.committed)throw Object.assign(new Error(reason),{status:409});
  return {version:result.snapshot.child(op.id).val().version};
 }catch(error){
  // A genuinely missing versioned record cannot be recreated under the rules.
  // Distinguish this from a permissions error without weakening those rules.
  if(/permission[-_]denied/i.test(String((error as any)?.code))&&op.version>0){
   let remote:WireRecords|null|undefined;
   try{remote=(await get(reference)).val();}catch{/* Preserve the original error if the read is also denied. */}
   if(remote!==undefined){
    const current=remote?.[op.id];
    if(isAcknowledged(current,op))return {version:current!.version};
    if(!current||current.version!==op.version||current.kind!==op.kind)throw Object.assign(new Error(VERSION_CONFLICT),{status:409});
   }
  }
  throw error;
 }
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

