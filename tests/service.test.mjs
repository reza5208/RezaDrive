import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currentOdometer,serviceReminders,addCalendarMonths,malaysiaDate} from '../lib/service.ts';
import {summarize,walletMovement} from '../lib/model.ts';
const e=(kind,data,id='r')=>({kind,data,id,version:1});
const service=(data={},id='a')=>e('service',{itemId:'oil',label:'Oil',at:'2026-01-31T04:00:00Z',odo:1000,intervalKm:10000,intervalMonths:6,cost:200,...data},id);
test('highest real reading includes sessions fuel and service; ignores deleted and missing values',()=>{
 assert.equal(currentOdometer([]),null);
 assert.equal(currentOdometer([e('session',{startOdo:900,endOdo:1200}),e('fuel',{odo:1300}),service({odo:1000}),{...e('fuel',{odo:9000}),deleted:true},e('session',{startOdo:1100,endOdo:null})]),1300);
});
test('calendar month addition clamps month-end and leap years',()=>{assert.equal(addCalendarMonths('2026-01-31',1),'2026-02-28');assert.equal(addCalendarMonths('2028-01-31',1),'2028-02-29');assert.equal(addCalendarMonths('2026-12-31',2),'2027-02-28');});
test('Malaysia calendar day follows local midnight',()=>assert.equal(malaysiaDate('2026-01-31T17:00:00Z'),'2026-02-01'));
test('due when distance OR date reaches interval, including equality',()=>{
 assert.equal(serviceReminders([service(),e('fuel',{odo:11000})],'2026-02-01')[0].status,'due');
 assert.equal(serviceReminders([service()],'2026-07-31')[0].status,'due');
 assert.equal(serviceReminders([service()],'2026-02-01')[0].status,'scheduled');
});
test('early warning at 500km or 14 days and supports single interval',()=>{
 assert.equal(serviceReminders([service({intervalMonths:null}),e('fuel',{odo:10500})],'2026-02-01')[0].status,'soon');
 const r=serviceReminders([service({intervalKm:null})],'2026-07-17')[0];assert.equal(r.status,'soon');assert.equal(r.remainingDays,14);assert.equal(r.nextOdo,null);
});
test('completion retains history and only most recent service per item determines next reminder',()=>{
 const rows=[service(),service({at:'2026-07-30T04:00:00Z',odo:10500},'b'),service({itemId:'atf',intervalKm:30000,intervalMonths:null},'c')];
 const reminders=serviceReminders(rows,'2026-08-01');assert.equal(reminders.length,2);assert.equal(reminders.find(r=>r.entry.data.itemId==='oil').nextOdo,20500);assert.equal(rows.length,3);
 rows[1].deleted=true;assert.equal(serviceReminders(rows,'2026-08-01').find(r=>r.entry.data.itemId==='oil').entry.id,'a');
});
test('service costs do not change session profits or wallet',()=>{
 const job=e('job',{method:'wallet',net:50,tip:0});assert.equal(summarize([job,service()]).profit,50);assert.equal(walletMovement([job,service()]),50);
});
