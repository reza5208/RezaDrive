import {test} from 'node:test';
import assert from 'node:assert/strict';
import {t,setCurrentLanguage,getLocale} from '../lib/locale.ts';
import {money,jobNet,summarize} from '../lib/model.ts';
test('language switches labels, standard Malay and interpolation',()=>{
 setCurrentLanguage('en');assert.equal(t('Tambah Job'),'Add Job');assert.equal(t('pendingSync',{count:3}),'3 not synced');assert.equal(getLocale(),'en-MY');
 setCurrentLanguage('ms');assert.equal(t('Tambah Job'),'Tambah Tugasan');assert.equal(t('Tengok hasil usaha hang.'),'Semak hasil usaha anda.');assert.equal(getLocale(),'ms-MY');
});
test('switching language does not change financial calculations or stored records',()=>{
 const record={id:'example',kind:'job',version:1,data:{sessionId:'session',method:'cash',gross:43,deductions:7.78,tip:5,tipMethod:'cash',pickup:'Laporan',dropoff:'Makan',note:'Tolong simpan nota saya'}};
 const before=JSON.stringify(record);
 setCurrentLanguage('ms');const ms=summarize([record]);const msAmount=money(jobNet(record.data));
 setCurrentLanguage('en');assert.deepEqual(summarize([record]),ms);assert.equal(jobNet(record.data),40.22);assert.ok(money(jobNet(record.data)).includes('40.22'));assert.ok(msAmount.includes('40.22'));assert.equal(JSON.stringify(record),before);
});
test('unrecognised runtime messages stay readable and tokens are replaced literally',()=>{
 setCurrentLanguage('en');assert.equal(t('Firebase: network error.'),'Firebase: network error.');assert.equal(t('rowTip',{amount:'RM5.00',method:'Cash'}),'Tip RM5.00 (Cash)');setCurrentLanguage('ms');
});
