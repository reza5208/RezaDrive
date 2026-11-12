import { useCallback,useEffect,useRef,useState } from 'react';
import { Entry } from './model';
import { demoRecords } from './demo';
import {importPlan,makeBackup} from './backup';
import {cloudRead,cloudWrite,cloudError,observeConnection} from './cloud';
export function useRecords(owner:string|null,demo:boolean){
 const [records,setRecords]=useState<Entry[]>([]),[ready,setReady]=useState(false),[status,setStatus]=useState('Memuatkan'),[pending,setPending]=useState(0),[error,setError]=useState('');
 const [lastSync,setLastSync]=useState<string|null>(null),[connected,setConnected]=useState(false),[recoveries,setRecoveries]=useState<any[]>([]);
 const lastAck=useRef<string|null>(null),scope=useRef('');
 const rows=useRef<Entry[]>([]),queue=useRef<Entry[]>([]),busy=useRef(false),blocked=useRef(false);
 const key='rezadrive-v1-'+(demo?'demo':owner||'guest');
 const persist=useCallback(()=>{
   localStorage.setItem(key,JSON.stringify({records:rows.current,queue:queue.current,lastSync:lastAck.current}));
   setRecords([...rows.current]);setPending(queue.current.length);
 },[key]);
 const sync=useCallback(async()=>{
  if(demo){setStatus('Mod demo');return;}
  if(!owner||busy.current||blocked.current)return;
  if(owner==='local'){setStatus('Device ini');return;}
  if(!navigator.onLine){setStatus('Offline');return;}
  const ownScope=scope.current;
  busy.current=true;setStatus('Menyegerak');
  try{
   while(queue.current.length){
    const op=queue.current[0];
    const out=await cloudWrite(owner,op);
    if(scope.current!==ownScope)return;
    queue.current.shift();
    const same=queue.current.find(r=>r.id===op.id);
    if(same)same.version=out.version;
    else rows.current=rows.current.map(r=>r.id===op.id?{...r,version:out.version}:r);
    persist();
   }
   const out={records:await cloudRead(owner)};
   if(scope.current!==ownScope)return;
   const pendingIds=new Set(queue.current.map(r=>r.id));
   rows.current=[...out.records.filter((r:Entry)=>!pendingIds.has(r.id)),...rows.current.filter(r=>pendingIds.has(r.id))];
   lastAck.current=new Date().toISOString();setLastSync(lastAck.current);
   persist();setStatus(queue.current.length?'Menunggu sync':'Disimpan di awan');setError('');
  }catch(e){if(scope.current!==ownScope)return;if((e as any).status===409)blocked.current=true;setStatus(blocked.current?'Perlu semakan':'Belum sync');setError(cloudError(e));}
  finally{if(scope.current===ownScope)busy.current=false;}
 },[demo,owner,persist]);
 useEffect(()=>{
  scope.current=key;busy.current=false;lastAck.current=null;setLastSync(null);setConnected(false);
  setReady(false);rows.current=[];queue.current=[];blocked.current=false;setError('');
  try{const cached=JSON.parse(localStorage.getItem(key)||'null');rows.current=cached?.records||(demo?demoRecords():[]);queue.current=cached?.queue||[];lastAck.current=cached?.lastSync||null;setLastSync(lastAck.current);}catch{rows.current=demo?demoRecords():[];}
  try{setRecoveries(JSON.parse(localStorage.getItem(key+'-recovery')||'[]'));}catch{setRecoveries([]);}
  setRecords([...rows.current]);setPending(queue.current.length);setReady(true);void sync();
  const offConnection=owner&&owner!=='local'&&!demo?observeConnection(setConnected):()=>{};
  const online=()=>void sync();const visible=()=>{if(document.visibilityState==='visible')void sync();};
  window.addEventListener('online',online);window.addEventListener('focus',online);document.addEventListener('visibilitychange',visible);
  const interval=setInterval(online,30000);
  return()=>{scope.current='';offConnection();window.removeEventListener('online',online);window.removeEventListener('focus',online);document.removeEventListener('visibilitychange',visible);clearInterval(interval);};
 },[key,demo,sync]);
 function applyImport(incoming:Entry[],mode:'merge'|'replace'){
  if(busy.current||queue.current.length)throw Error('ImportWait');
  const plan=importPlan(rows.current,incoming,mode);if(!plan.ops.length)return;
  const snapshot={...makeBackup(rows.current),id:crypto.randomUUID(),reason:'before-import'};
  const copies=[snapshot,...JSON.parse(localStorage.getItem(key+'-recovery')||'[]')].slice(0,3);
  localStorage.setItem(key+'-recovery',JSON.stringify(copies));setRecoveries(copies);
  const previous=rows.current,oldQueue=queue.current;
  rows.current=[...rows.current.filter(r=>!plan.ops.some(op=>op.id===r.id)),...plan.ops];
  if(!demo&&owner!=='local')queue.current=[...plan.ops];
  try{persist();}catch(e){rows.current=previous;queue.current=oldQueue;throw e;}
  void sync();
 }
 function save(entry:Entry){
  const previous=[...rows.current],oldQueue=[...queue.current];
  const old=rows.current.find(r=>r.id===entry.id);
  const op={...entry,version:old?.version||0};
  rows.current=[...rows.current.filter(r=>r.id!==entry.id),op];
  if(!demo&&owner!=='local'){
    // Never change an operation while it may be in flight. Chain a later edit.
    const pendingIndex=queue.current.findIndex((r,i)=>r.id===entry.id&&(!busy.current||i!==0));
    if(pendingIndex>=0)queue.current[pendingIndex]={...op,version:queue.current[pendingIndex].version};
    else queue.current.push(op);
  }
  try{persist();}catch{rows.current=previous;queue.current=oldQueue;throw Error('Storan peranti penuh. Rekod belum disimpan.');}
  setStatus(demo?'Mod demo':owner==='local'?'Device ini':'Menunggu sync');void sync();
 }
 async function useCloud(){
  if(!owner||owner==='local')throw Error('Tiada akaun cloud.');const out={records:await cloudRead(owner)};
  // Keep unrelated unsynced work. Discard only the operation the user reviewed.
  const rejected=queue.current[0]?.id;queue.current=queue.current.filter(r=>r.id!==rejected);
  const ids=new Set(queue.current.map(r=>r.id));
  rows.current=[...out.records.filter((r:Entry)=>!ids.has(r.id)),...rows.current.filter(r=>ids.has(r.id))];
  blocked.current=false;persist();setError('');void sync();
 }
 function retrySync(){blocked.current=false;return sync();}
 return {applyImport,lastSync,connected,recoveries,retrySync,records:records.filter(r=>!r.deleted),ready,status,pending,error,save,sync,useCloud,conflict:status==='Perlu semakan',conflictEntry:queue.current[0]};
}

