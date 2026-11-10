import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobNet,summarize,walletMovement,consumption} from '../lib/model.ts';
const e=(kind,data,id='r')=>({kind,data,id,version:1});
test('cash commission and SST plus cash tip',()=>assert.equal(jobNet({method:'cash',gross:43,deductions:7.78,tip:5}),40.22));
test('wallet Earnings is never charged commission again',()=>assert.equal(jobNet({method:'wallet',net:35.22,deductions:7.78,tip:0}),35.22));
test('wallet transfer is not income and fuel fill is separate from session cost',()=>{
 const rows=[e('session',{startOdo:100,endOdo:185,startAt:'2026-11-10T10:00:00Z',endAt:'2026-11-10T13:00:00Z'},'s'),e('job',{sessionId:'s',method:'cash',gross:100,deductions:10,tip:5}),e('expense',{sessionId:'s',amount:10,reimbursed:4}),e('fuel',{amount:50}),e('transfer',{amount:100,direction:'in'})];
 assert.deepEqual(summarize(rows,'s'),{earned:95,tips:5,spent:6,profit:89,jobs:1,km:85,hours:3});
});
test('wallet tracks net earnings, cash deductions and tips by actual method',()=>{
 const rows=[e('job',{method:'wallet',net:35.22,tip:5,tipMethod:'cash'}),e('job',{method:'cash',gross:30,deductions:7.78,tip:2,tipMethod:'wallet'}),e('transfer',{direction:'in',amount:50}),e('transfer',{direction:'out',amount:20})];
 assert.equal(walletMovement(rows),59.44);
});
test('deleted job does not contribute to profit',()=>assert.equal(summarize([{...e('job',{method:'wallet',net:99,tip:0}),deleted:true}]).earned,0));
const fill=(odo,amount,litres,full,at)=>e('fuel',{odo,amount,litres,full,at});
test('full-to-full uses intervening partial fills and excludes opening fill',()=>{
 const c=consumption([fill(1000,100,50,true,'2026-11-01'),fill(1200,20,10,false,'2026-11-02'),fill(1500,80,40,true,'2026-11-03')]);
 assert.equal(c.kmPerL,10);assert.equal(c.costPerKm,.2);assert.equal(c.cycles.length,1);
});
test('missing litres blocks consumption estimate',()=>assert.equal(consumption([fill(1000,50,20,true,'2026-11-01'),fill(1200,50,null,false,'2026-11-02'),fill(1500,50,20,true,'2026-11-03')]).costPerKm,0));
test('one full tank is insufficient',()=>assert.equal(consumption([fill(1000,50,20,true,'2026-11-01')]).kmPerL,0));
