export type Kind = 'session'|'job'|'expense'|'fuel'|'transfer';
export type Pay = 'cash'|'qr'|'wallet';
export type Loc = {lat:number;lng:number;accuracy:number;at:string};
export type Entry = {id:string;kind:Kind;version:number;deleted?:boolean;data:Record<string,any>};
export const money = (v:number) => new Intl.NumberFormat('ms-MY',{style:'currency',currency:'MYR'}).format(v||0);
export const payLabel:Record<Pay,string> = {cash:'Cash',qr:'QR',wallet:'Wallet Lalamove'};
export const round = (v:number) => Math.round((v+Number.EPSILON)*100)/100;
export function jobNet(d:Record<string,any>) {return round((d.method==='wallet' ? Number(d.net)||0 : (Number(d.gross)||0)-(Number(d.deductions)||0))+(Number(d.tip)||0));}
export function summarize(rows:Entry[],sessionId?:string) {
 const selected=rows.filter(r=>!r.deleted&&(!sessionId||r.data.sessionId===sessionId));
 const jobs=selected.filter(r=>r.kind==='job'), expenses=selected.filter(r=>r.kind==='expense');
 const earned=round(jobs.reduce((s,r)=>s+jobNet(r.data),0));
 const tips=round(jobs.reduce((s,r)=>s+(Number(r.data.tip)||0),0));
 const spent=round(expenses.reduce((s,r)=>s+(Number(r.data.amount)||0)-(Number(r.data.reimbursed)||0),0));
 const sessions=rows.filter(r=>!r.deleted&&r.kind==='session'&&(!sessionId||r.id===sessionId));
 const km=sessions.reduce((s,r)=>s+(r.data.endOdo!=null?Math.max(0,r.data.endOdo-r.data.startOdo):0),0);
 const hours=sessions.reduce((s,r)=>s+(r.data.endAt?Math.max(0,(Date.parse(r.data.endAt)-Date.parse(r.data.startAt))/3600000):0),0);
 return {earned,tips,spent,profit:round(earned-spent),jobs:jobs.length,km,hours};
}
export function walletMovement(rows:Entry[]) {
 return round(rows.filter(r=>!r.deleted).reduce((s,r)=>{
 const d=r.data;
 if(r.kind==='job')return s+(d.method==='wallet'?Number(d.net)||0:-(Number(d.deductions)||0))+(d.tipMethod==='wallet'?Number(d.tip)||0:0);
 if(r.kind==='transfer')return s+(d.direction==='out'?-Number(d.amount):Number(d.amount));
 return s;
 },0));
}
export function consumption(rows:Entry[]) {
 const fuel=rows.filter(r=>!r.deleted&&r.kind==='fuel').sort((a,b)=>Date.parse(a.data.at)-Date.parse(b.data.at));
 const cycles:{km:number;litres:number;cost:number;from:string;to:string}[]=[];
 let anchor=-1;
 for(let i=0;i<fuel.length;i++){
   if(!fuel[i].data.full)continue;
   if(anchor>=0){
     const group=fuel.slice(anchor+1,i+1),km=fuel[i].data.odo-fuel[anchor].data.odo;
     if(km>0&&group.every(r=>Number(r.data.litres)>0))cycles.push({km,litres:group.reduce((s,r)=>s+Number(r.data.litres),0),cost:group.reduce((s,r)=>s+Number(r.data.amount),0),from:fuel[anchor].data.at,to:fuel[i].data.at});
   }
   anchor=i;
 }
 const km=cycles.reduce((s,c)=>s+c.km,0),litres=cycles.reduce((s,c)=>s+c.litres,0),cost=cycles.reduce((s,c)=>s+c.cost,0);
 return {cycles,kmPerL:litres?km/litres:0,costPerKm:km?cost/km:0};
}
