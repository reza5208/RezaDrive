import {LanguageProvider,useLanguage} from './i18n';
import {t} from '../lib/locale';
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Dashboard from './dashboard';
import {cloudError,googleSignIn,googleSignOut,initializeCloud} from '../lib/cloud';
import './styles.css';
function App(){
 useLanguage();
 const [user,setUser]=useState<{id:string;name:string;email:string}|null>(null),[local,setLocal]=useState(()=>localStorage.getItem('rezadrive-device-mode')==='true'),[error,setError]=useState(''),[authReady,setAuthReady]=useState(false);
 useEffect(()=>{let disposed=false;let unsub:(()=>void)|undefined;initializeCloud(u=>{if(!disposed){setUser(u?{id:u.uid,name:u.displayName||'Reza',email:u.email||''}:null);setAuthReady(true);}}).then(f=>{if(disposed)f();else unsub=f;}).catch(e=>{if(!disposed){setError(cloudError(e));setAuthReady(true);}});return()=>{disposed=true;unsub?.();};},[]);
 async function login(){setError('');try{await googleSignIn();setLocal(false);localStorage.removeItem('rezadrive-device-mode');}catch(e){setError(cloudError(e));}}
 async function logout(){try{await googleSignOut();setUser(null);setLocal(false);localStorage.removeItem('rezadrive-device-mode');}catch(e){setError(cloudError(e));}}
 function device(){setLocal(true);localStorage.setItem('rezadrive-device-mode','true');setError('');}
 if(!authReady)return <main className="loading">{t('Memuatkan RezaDrive…')}</main>;
 return <Dashboard key={user?.id|| (local?'device':'guest')} user={user||(local?{id:'local',name:'Reza',email:t('Disimpan pada device ini sahaja')}:null)} onLogin={login} onLogout={logout} onLocal={device} authError={error}/>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><App/></LanguageProvider>);

