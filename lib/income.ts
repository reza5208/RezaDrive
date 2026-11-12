export type IncomeSummary={app:'RezaIncome';schemaVersion:1;source:'RezaOT'|'RezaDrive';month:string;basis:'received'|'work-estimate'|'before-fuel';amount:number;exportedAt:string};
export function parseIncome(text:string,source?:string):IncomeSummary{
 const v=JSON.parse(text);if(v.app!=='RezaIncome'||v.schemaVersion!==1||!['RezaOT','RezaDrive'].includes(v.source)||source&&v.source!==source||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month)||!(v.source==='RezaDrive'?v.basis==='before-fuel':['received','work-estimate'].includes(v.basis))||!Number.isFinite(v.amount)||Math.abs(v.amount)>10000000||!Number.isFinite(Date.parse(v.exportedAt)))throw Error('IncomeInvalid');
 return {app:v.app,schemaVersion:1,source:v.source,month:v.month,basis:v.basis,amount:v.amount,exportedAt:v.exportedAt};
}
