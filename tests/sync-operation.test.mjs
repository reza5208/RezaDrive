import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planWrite,wireRecord,VERSION_CONFLICT,ACTIVE_SESSION_CONFLICT} from '../lib/sync-operation.ts';
const stamp='2026-11-11T14:00:00.000Z';
const session=(id,version,endAt=null)=>({id,kind:'session',version,data:{startAt:'2026-11-11T12:00:00.000Z',startOdo:100,endAt,endOdo:endAt?110:null,note:''}});
test('cold-cache edit proposes a server round trip instead of a false conflict',()=>{
 const op=session('s',1,'2026-11-11T13:00:00.000Z');
 const first=planWrite(null,op,stamp);assert.ok(first.records);assert.equal(first.reason,undefined);
 const server={s:wireRecord(session('s',0),stamp)};
 const next=planWrite(server,op,stamp);assert.equal(next.records.s.version,2);assert.equal(JSON.parse(next.records.s.payload).endOdo,110);
});
test('retry preserves sibling records and does not mutate the SDK snapshot',()=>{
 const server={s:wireRecord(session('s',0),stamp),expense:wireRecord({id:'expense',kind:'expense',version:0,data:{amount:2.5,sessionId:'s'}},stamp)};
 const before=JSON.stringify(server);const plan=planWrite(server,session('s',1,'2026-11-11T13:00:00.000Z'),stamp);
 assert.equal(JSON.stringify(server),before);assert.deepEqual(plan.records.expense,server.expense);assert.notEqual(plan.records,server);
});
test('a real concurrent edit still blocks instead of overwriting remote data',()=>{
 const server={s:wireRecord(session('s',1,'2026-11-11T13:10:00.000Z'),stamp)};
 const plan=planWrite(server,session('s',1,'2026-11-11T13:00:00.000Z'),stamp);assert.equal(plan.reason,VERSION_CONFLICT);assert.equal(plan.records,undefined);
});
test('lost acknowledgement retries are idempotent',()=>{
 const op=session('s',1,'2026-11-11T13:00:00.000Z'),server={s:wireRecord(op,stamp)};
 assert.equal(planWrite(server,op,'2026-11-11T15:00:00.000Z').records.s.version,2);assert.equal(planWrite(server,op,stamp).records,server);
});
test('an active session on another device is preserved',()=>{
 const plan=planWrite({s:wireRecord(session('s',0),stamp)},session('other',0),stamp);assert.equal(plan.reason,ACTIVE_SESSION_CONFLICT);
});
test('known missing record and changed kind remain conflicts',()=>{
 assert.equal(planWrite({},session('s',1),stamp).reason,VERSION_CONFLICT);
 assert.equal(planWrite({s:{...wireRecord(session('s',0),stamp),kind:'fuel'}},session('s',1),stamp).reason,VERSION_CONFLICT);
});
