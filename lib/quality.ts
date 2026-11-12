import type {Entry} from './model';
export function recordWarnings(entry:Entry,records:Entry[]){
 const d=entry.data,other=records.filter(r=>!r.deleted&&r.id!==entry.id),out:string[]=[];
 if(entry.kind==='session'||entry.kind==='fuel'||entry.kind==='service'){
  const at=d.at||d.startAt,odo=d.odo??d.startOdo;
  const readings=other.flatMap(r=>r.kind==='session'?[{at:r.data.startAt,odo:r.data.startOdo},...(r.data.endAt?[{at:r.data.endAt,odo:r.data.endOdo}]:[])]:r.kind==='fuel'||r.kind==='service'?[{at:r.data.at,odo:r.data.odo}]:[]);
  if(readings.some(r=>Date.parse(r.at)<Date.parse(at)&&r.odo>odo||Date.parse(r.at)>Date.parse(at)&&r.odo<odo))out.push('OdoWarning');
  if(entry.kind==='session'&&d.endAt&&d.endOdo-d.startOdo>1500)out.push('DistanceWarning');
 }
 if(entry.kind==='job'){
  if(other.some(r=>r.kind==='job'&&r.data.sessionId===d.sessionId&&r.data.pickup===d.pickup&&r.data.dropoff===d.dropoff&&r.data.method===d.method&&r.data.gross===d.gross&&r.data.net===d.net&&Math.abs(Date.parse(r.data.at)-Date.parse(d.at))<5*60000))out.push('DuplicateWarning');
  if(d.method!=='wallet'&&d.gross>0&&d.deductions/d.gross>.4)out.push('DeductionWarning');
 }
 return out;
}
