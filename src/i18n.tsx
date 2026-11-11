import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {getLanguage,setCurrentLanguage,t,type Language} from '../lib/locale';
const KEY='rezadrive-language';
const LanguageContext=createContext<{language:Language;setLanguage:(value:Language)=>void}>({language:'ms',setLanguage:()=>{}});
export function LanguageProvider({children}:{children:ReactNode}){
 const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem(KEY)==='en'?'en':'ms';}catch{return 'ms';}});
 // Formatters and UI text use the same selection during this render.
 setCurrentLanguage(language);
 useEffect(()=>{document.documentElement.lang=language;document.title=language==='en'?'RezaDrive — Track your work, see your earnings':'RezaDrive — Rekod kerja, lihat hasil';try{localStorage.setItem(KEY,language);}catch{/* Language selection remains usable when storage is unavailable. */}},[language]);
 return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function LanguageSelector({full=false}:{full?:boolean}){
 const {language,setLanguage}=useLanguage();
 return <label className={full?'language-picker language-full':'language-picker'}><span aria-hidden="true">◎</span>{full&&<span>Bahasa / Language</span>}<select aria-label="Bahasa / Language" value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="ms">{full?'Bahasa Melayu':'BM'}</option><option value="en">{full?'English':'EN'}</option></select></label>;
}
