import type {Entry} from './model';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds=['session','job','expense','fuel','transfer','service'];
const obj=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const date=(v:any)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const num=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10000000;
export function validateRecords(input:unknown):Entry[]{
 if(!Array.isArray(input)||input.length>20000)throw Error('BackupInvalid');
 const ids=new Set<string>();
 const result=input.map((r:any)=>{
  if(!obj(r)||!uuid.test(r.id)||ids.has(r.id)||!kinds.includes(r.kind)||!obj(r.data)||JSON.stringify(r.data).length>12000)throw Error('BackupInvalid');ids.add(r.id);
  const d=r.data,k=r.kind; if(k==='session'){
   if(!date(d.startAt)||!num(d.startOdo)||d.endAt!=null&&(!date(d.endAt)||Date.parse(d.endAt)<Date.parse(d.startAt)||!num(d.endOdo)||d.endOdo<d.startOdo))throw Error('BackupInvalid');
  }else if(!date(d.at))throw Error('BackupInvalid');
  if(['job','expense'].includes(k)&&!uuid.test(d.sessionId))throw Error('BackupInvalid');
  if(k==='job'&&(!['cash','qr','wallet'].includes(d.method)||!['cash','qr','wallet'].includes(d.tipMethod)||!['gross','deductions','net','tip'].every(n=>num(d[n]))||d.method!=='wallet'&&d.deductions>d.gross))throw Error('BackupInvalid');
  if(k==='expense'&&(!['tol','makan','parking','lain'].includes(d.category)||!num(d.amount)||d.amount<=0||!num(d.reimbursed)||d.reimbursed>d.amount))throw Error('BackupInvalid');
  if(k==='fuel'&&(!num(d.odo)||!num(d.amount)||d.amount<=0||d.litres!=null&&(!num(d.litres)||d.litres<=0)||typeof d.full!=='boolean'))throw Error('BackupInvalid');
  if(k==='transfer'&&(!num(d.amount)||d.amount<=0||!['in','out'].includes(d.direction)))throw Error('BackupInvalid');
  if(k==='service'&&(!uuid.test(d.itemId)||typeof d.label!=='string'||!d.label.trim()||d.label.length>120||!num(d.odo)||d.cost!=null&&!num(d.cost)||!(d.intervalKm>0||d.intervalMonths>0)||d.intervalKm!=null&&(!num(d.intervalKm)||d.intervalKm<=0)||d.intervalMonths!=null&&(!Number.isInteger(d.intervalMonths)||d.intervalMonths<1||d.intervalMonths>1200)))throw Error('BackupInvalid');
  if(d.note!=null&&(typeof d.note!=='string'||d.note.length>500))throw Error('BackupInvalid');
  return {id:r.id,kind:r.kind,data:JSON.parse(JSON.stringify(d)),version:0,...(r.deleted?{deleted:true}:{})} as Entry;
 });
 const sessions=new Set(result.filter(r=>r.kind==='session'&&!r.deleted).map(r=>r.id));
 if(result.some(r=>!r.deleted&&r.data.sessionId&&!sessions.has(r.data.sessionId)))throw Error('BackupOrphan');
 if(result.filter(r=>!r.deleted&&r.kind==='session'&&!r.data.endAt).length>1)throw Error('BackupActive');
 return result;
}
export function parseBackup(text:string){
 if(text.length>12000000)throw Error('BackupInvalid');
 let value:any;try{value=JSON.parse(text);}catch{throw Error('BackupInvalid');}
 if(!obj(value)||value.app&&value.app!=='RezaDrive'||value.schemaVersion&&value.schemaVersion!==2)throw Error('BackupInvalid');
 return validateRecords(value.records).filter(r=>!r.deleted);
}
export function importPlan(current:Entry[],incoming:Entry[],mode:'merge'|'replace'){
 const map=new Map(current.map(r=>[r.id,r]));
 const ops:Entry[]=[];
 for(const r of incoming){const old=map.get(r.id);if(old&&old.kind!==r.kind)throw Error('BackupInvalid');if(!old||old.deleted||JSON.stringify(old.data)!==JSON.stringify(r.data))ops.push({...r,version:old?.version||0});}
 if(mode==='replace'){const ids=new Set(incoming.map(r=>r.id));for(const r of current)if(!r.deleted&&!ids.has(r.id))ops.push({...r,deleted:true});}
 const next=[...current.filter(r=>!ops.some(op=>op.id===r.id)),...ops];
 validateRecords(next);
 ops.sort((a,b)=>Number(!a.deleted)-Number(!b.deleted)||Number(b.kind==='session')-Number(a.kind==='session'));
 return {ops,added:ops.filter(r=>!r.deleted&&!map.has(r.id)).length,changed:ops.filter(r=>!r.deleted&&map.has(r.id)).length,removed:ops.filter(r=>r.deleted).length};
}
export function makeBackup(records:Entry[]){return {app:'RezaDrive',schemaVersion:2,exportedAt:new Date().toISOString(),records:records.filter(r=>!r.deleted)};}
