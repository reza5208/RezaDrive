const VERSION='rezadrive-pages-v2-language';
const ROOT=new URL('./',self.location.href).pathname;
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(c=>c.addAll([ROOT,ROOT+'manifest.webmanifest',ROOT+'icon-192.png'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rezadrive-pages-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(ROOT))return;
 if(u.pathname.endsWith('cloud-config.json')){event.respondWith(fetch(event.request).then(res=>{if(res.ok){const clone=res.clone();caches.open(VERSION).then(c=>c.put(event.request,clone));}return res;}).catch(async()=>await caches.match(event.request)||new Response('{"enabled":false,"firebaseConfig":{}}',{headers:{'Content-Type':'application/json'}})));return;}
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(res=>{if(res.ok){const clone=res.clone();caches.open(VERSION).then(c=>c.put(ROOT,clone));}return res;}).catch(()=>caches.match(ROOT)));return;}
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{if(res.ok){const clone=res.clone();caches.open(VERSION).then(c=>c.put(event.request,clone));}return res;})));
});

