// Wealthflow – offline režim.
// Aplikace (index.html) se načítá nejdřív z internetu, aby se vždy dostala nejnovější verze;
// bez připojení se použije uložená kopie. React a písmo se berou z uložené kopie.
// Data (localStorage) service worker neřeší – ta jsou v telefonu vždy.
const CACHE="wealthflow-v2";
const APP_URL=new URL("./",self.location).href;
const LIBS=[
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([APP_URL,...LIBS]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

// Síť s časovým limitem, aby slabý signál nezdržoval spuštění.
function fetchWithTimeout(req,ms){
  return new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(new Error("timeout")),ms);
    fetch(req).then(r=>{clearTimeout(t);resolve(r);},err=>{clearTimeout(t);reject(err);});
  });
}

async function appShell(req){
  const cache=await caches.open(CACHE);
  try{
    const res=await fetchWithTimeout(req,4000);
    if(res&&res.ok)await cache.put(APP_URL,res.clone());
    return res;
  }catch{
    return (await cache.match(APP_URL))||Response.error();
  }
}

async function cacheFirst(req){
  const cache=await caches.open(CACHE);
  const hit=await cache.match(req);
  if(hit)return hit;
  const res=await fetch(req);
  if(res&&(res.ok||res.type==="opaque"))await cache.put(req,res.clone());
  return res;
}

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(req.mode==="navigate"&&url.origin===self.location.origin){event.respondWith(appShell(req));return;}
  if(url.hostname==="cdn.jsdelivr.net"||url.hostname==="fonts.googleapis.com"||url.hostname==="fonts.gstatic.com"){event.respondWith(cacheFirst(req));return;}
});
