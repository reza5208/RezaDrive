import type {Entry} from './model';
export type ServiceStatus='due'|'soon'|'scheduled';
export type ServiceReminder={entry:Entry;nextOdo:number|null;nextDate:string|null;remainingKm:number|null;remainingDays:number|null;status:ServiceStatus};
const ZONE='Asia/Kuala_Lumpur';
export function malaysiaDate(value=new Date().toISOString()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function addCalendarMonths(date:string,months:number){
 const [year,month,day]=date.split('-').map(Number);
 const first=new Date(Date.UTC(year,month-1+months,1));
 const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(day,last))).toISOString().slice(0,10);
}
export function currentOdometer(rows:Entry[]):number|null{
 const readings:number[]=[];
 for(const r of rows){if(r.deleted)continue;const d=r.data;
  const values=r.kind==='session'?[d.startOdo,d.endOdo]:r.kind==='fuel'||r.kind==='service'?[d.odo]:[];
  for(const v of values)if(typeof v==='number'&&Number.isFinite(v)&&v>=0)readings.push(v);
 }
 return readings.length?Math.max(...readings):null;
}
export function serviceReminders(rows:Entry[],today=malaysiaDate()):ServiceReminder[]{
 const latest=new Map<string,Entry>();
 for(const r of rows){if(r.deleted||r.kind!=='service')continue;const key=r.data.itemId||r.id,old=latest.get(key);
  if(!old||r.data.at>old.data.at||r.data.at===old.data.at&&r.data.odo>old.data.odo)latest.set(key,r);
 }
 const odo=currentOdometer(rows),day=Date.parse(today+'T00:00:00Z');
 const reminders=[...latest.values()].map(entry=>{
  const d=entry.data;
  const nextOdo=Number(d.intervalKm)>0?d.odo+Number(d.intervalKm):null;
  const nextDate=Number(d.intervalMonths)>0?addCalendarMonths(malaysiaDate(d.at),Number(d.intervalMonths)):null;
  const remainingKm=nextOdo!==null&&odo!==null?Math.round((nextOdo-odo)*100)/100:null;
  const remainingDays=nextDate?Math.round((Date.parse(nextDate+'T00:00:00Z')-day)/86400000):null;
  const status:ServiceStatus=remainingKm!==null&&remainingKm<=0||remainingDays!==null&&remainingDays<=0?'due':remainingKm!==null&&remainingKm<=500||remainingDays!==null&&remainingDays<=14?'soon':'scheduled';
  return {entry,nextOdo,nextDate,remainingKm,remainingDays,status};
 });
 const rank={due:0,soon:1,scheduled:2};
 return reminders.sort((a,b)=>rank[a.status]-rank[b.status]||(a.remainingDays??Infinity)-(b.remainingDays??Infinity)||(a.remainingKm??Infinity)-(b.remainingKm??Infinity));
}
