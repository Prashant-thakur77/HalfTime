import { chromium } from '@playwright/test';
const S='/tmp/claude-1000/-home-prashant-projects-HalfTime/3fdb86b8-e1af-4dbe-ad2e-478f456bfeb7/scratchpad/shots';
const B='http://localhost:3100';
const b=await chromium.launch();
async function run(name,vp,opts={}){
 const c=await b.newContext({viewport:vp,...opts}); const p=await c.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(B+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
 const H=await p.evaluate(()=>document.documentElement.scrollHeight);
 const vh=vp.height; let i=0;
 for(let y=0;y<H;y+= Math.round(vh*0.5)){ await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(700); await p.screenshot({path:`${S}/${name}-home-${String(i++).padStart(2,'0')}.png`}); if(i>40)break;}
 const ow=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 console.log(name,'H',H,'overflowX',ow);
 for(const r of ['/sweep','/case/S01','/case/S02','/vs-chatbot','/results','/law']){
  await p.goto(B+r,{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  const tag=r.replace(/\//g,'_');
  await p.screenshot({path:`${S}/${name}${tag}.png`,fullPage:true});
  const ow=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth); if(ow)console.log(name,r,'overflowX');
  if(r==='/sweep'){ const btn=p.getByText(/Sweep the sample jail/i).first(); if(await btn.count()){ await btn.click(); await p.waitForTimeout(800); await p.screenshot({path:`${S}/${name}${tag}-mid.png`}); await p.waitForTimeout(6000); await p.screenshot({path:`${S}/${name}${tag}-done.png`,fullPage:true}); } else console.log('no sweep btn'); }
 }
 console.log(name,'errors',errs.slice(0,10));
 await c.close();
}
await run('d',{width:1440,height:900});
await run('m',{width:390,height:844},{isMobile:true,hasTouch:true});
await run('r',{width:1440,height:900},{reducedMotion:'reduce'});
await b.close();
