import {english,standardMalay} from './translations.ts';
export type Language='ms'|'en';
let language:Language='ms';
export function getLanguage(){return language;}
export function setCurrentLanguage(value:Language){language=value;}
export function getLocale(){return language==='en'?'en-MY':'ms-MY';}
export function t(source:string,values?:Record<string,string|number>){
 const message=(language==='en'?english[source]:standardMalay[source])??source;
 return message.replace(/\{(\w+)\}/g,(match,key)=>values&&Object.hasOwn(values,key)?String(values[key]):match);
}
