import type { Entry } from './model';
export function demoRecords():Entry[]{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const sessionId='11111111-1111-4111-8111-111111111111';
 return [{id:sessionId,kind:'session',version:0,data:{startAt:today+'T10:30:00.000Z',startOdo:185200,endOdo:null,endAt:null,note:''}},
 {id:'22222222-2222-4222-8222-222222222222',kind:'job',version:0,data:{sessionId,at:today+'T11:15:00.000Z',pickup:'Selayang',dropoff:'Kepong',pickupLoc:null,dropoffLoc:null,method:'wallet',gross:0,deductions:0,net:35.22,tip:5,tipMethod:'cash',note:''}},
 {id:'33333333-3333-4333-8333-333333333333',kind:'job',version:0,data:{sessionId,at:today+'T12:00:00.000Z',pickup:'Kepong',dropoff:'Batu Caves',pickupLoc:null,dropoffLoc:null,method:'cash',gross:30,deductions:7.78,net:0,tip:0,tipMethod:'cash',note:''}},
 {id:'44444444-4444-4444-8444-444444444444',kind:'expense',version:0,data:{sessionId,at:today+'T11:30:00.000Z',category:'tol',amount:2.5,reimbursed:0,note:''}},
 {id:'55555555-5555-4555-8555-555555555555',kind:'expense',version:0,data:{sessionId,at:today+'T12:30:00.000Z',category:'makan',amount:10,reimbursed:0,note:''}}];
}
