import type { Entry } from './model';

export type WireRecord={kind:Entry['kind'];payload:string;version:number;deleted:boolean;updatedAt:string};
export type WireRecords=Record<string,WireRecord>;
export const VERSION_CONFLICT='Rekod berubah pada peranti lain. Semak versi awan dahulu.';
export const ACTIVE_SESSION_CONFLICT='Ada sesi aktif pada peranti lain. Muat semula sebelum mula sesi baru.';

export function wireRecord(op:Entry,updatedAt:string):WireRecord {
 return {kind:op.kind,payload:JSON.stringify(op.data),version:op.version+1,deleted:!!op.deleted,updatedAt};
}
export function isAcknowledged(current:WireRecord|undefined,op:Entry){
 return !!current && current.kind===op.kind && current.version===op.version+1 && current.payload===JSON.stringify(op.data) && current.deleted===!!op.deleted;
}
export function planWrite(all:WireRecords|null,op:Entry,updatedAt:string):{records?:WireRecords;reason?:string}{
 const proposed=wireRecord(op,updatedAt);
 // null is an uninitialised SDK transaction cache, not evidence of a remote
 // deletion. A proposal makes Firebase check its server hash and retry the
 // updater with current server data. Never abort a versioned edit here.
 if(all===null)return {records:{[op.id]:proposed}};
 const current=all[op.id];
 if(isAcknowledged(current,op))return {records:all};
 if((current?.version||0)!==op.version || current&&current.kind!==op.kind)return {reason:VERSION_CONFLICT};
 if(!op.deleted&&op.kind==='session'&&!op.data.endAt){
  const active=Object.entries(all).some(([id,r])=>id!==op.id&&r.kind==='session'&&!r.deleted&&!JSON.parse(r.payload).endAt);
  if(active)return {reason:ACTIVE_SESSION_CONFLICT};
 }
 // Do not mutate Firebase's input: the updater can run repeatedly.
 return {records:{...all,[op.id]:proposed}};
}
