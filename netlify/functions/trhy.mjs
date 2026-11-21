// Wealthflow – denní uzávěrky trhů pro orientační odhad hodnoty investic.
// Aplikace volá /api/trhy?trhy=world,usa&od=2024-01-15 a dostane uzávěrky od daného dne.
// Data bere z Yahoo Finance (bez klíče). Odpověď drží Netlify hodinu v mezipaměti.
const MARKETS={
  world:"URTH",   // Svět (MSCI World)
  usa:"^GSPC",    // USA (S&P 500)
  tech:"^NDX",    // USA tech (Nasdaq 100)
  europe:"^STOXX",// Evropa (STOXX 600)
  em:"EEM",       // Rozvíjející trhy
  gold:"GC=F",    // Zlato
  btc:"BTC-USD",  // Bitcoin
};

async function closes(symbol,from){
  const p1=Math.floor(from.getTime()/1000),p2=Math.floor(Date.now()/1000);
  const url="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?interval=1d&period1="+p1+"&period2="+p2;
  const res=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0"}});
  if(!res.ok)throw new Error(symbol+" "+res.status);
  const r=(await res.json()).chart.result[0];
  const ts=r.timestamp||[],cl=r.indicators.quote[0].close||[];
  const d=[],c=[];
  ts.forEach((t,i)=>{if(cl[i]!=null){d.push(new Date(t*1000).toISOString().slice(0,10));c.push(Math.round(cl[i]*1e4)/1e4);}});
  return {d,c};
}

export default async req=>{
  const q=new URL(req.url).searchParams;
  const ids=(q.get("trhy")||"").split(",").filter(id=>MARKETS[id]);
  // Od zadaného dne (o týden dřív kvůli víkendům a svátkům), nejvýš 15 let zpět.
  let from=new Date((q.get("od")||"")+"T00:00:00Z");
  const min=new Date(Date.now()-15*365*864e5);
  if(isNaN(from)||from<min)from=min;
  from=new Date(from.getTime()-7*864e5);
  const out={};
  await Promise.all(ids.map(async id=>{try{out[id]=await closes(MARKETS[id],from);}catch{}}));
  return new Response(JSON.stringify({markets:out}),{headers:{
    "Content-Type":"application/json; charset=utf-8",
    "Netlify-CDN-Cache-Control":"public, max-age=3600, durable",
    "Cache-Control":"no-cache",
  }});
};

export const config={path:"/api/trhy"};
