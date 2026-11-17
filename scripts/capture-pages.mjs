import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base=(process.argv[2]||'http://127.0.0.1:5173/').replace(/\/?$/,'/');
const output=resolve(process.argv[3]||'.design/precision-review/local');
const cdp=process.env.CHROME_CDP||'http://127.0.0.1:9228';
const settleMotion=process.argv.includes('--settle-motion');
const pages=['index','about','product','process','service','news','news-detail','contact'];
await mkdir(output,{recursive:true});
const tab=await(await fetch(`${cdp}/json/new?about:blank`,{method:'PUT'})).json();
const socket=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const calls=new Map(),errors=[];
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);if(calls.has(message.id)){const cb=calls.get(message.id);calls.delete(message.id);cb(message);}});
const send=(method,params={})=>new Promise(resolve=>{const key=++id;calls.set(key,resolve);socket.send(JSON.stringify({id:key,method,params}));});
const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result.exceptionDetails)throw new Error(response.result.exceptionDetails.text);return response.result.result.value;};
await send('Page.enable');await send('Runtime.enable');
await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:settleMotion?'no-preference':'reduce'}]});
const report={base,viewport:[1920,1080],cacheDisabled:true,motionMode:settleMotion?'normal; scrolled and naturally completed':'reduced',pages:[],errors};
try{
 for(const page of pages){
  const url=new URL(`${page}.html`,base);
  await send('Page.navigate',{url:url.href});
  await send('Page.bringToFront');
  // A cold HTTPS load may take longer than the old fixed delay. Fonts.ready
  // can resolve before a pending stylesheet or module finishes downloading.
  let loaded=false;
  for(let attempt=0;attempt<300;attempt++){
   if(await evaluate(`location.pathname===${JSON.stringify(url.pathname)}&&document.readyState==='complete'`)){loaded=true;break;}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!loaded)throw new Error(`Page did not finish loading: ${url.href}`);
  await evaluate(String.raw`(async()=>{document.querySelectorAll('img').forEach(e=>e.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(e=>e.decode().catch(()=>{})));const urls=new Set();for(const element of document.querySelectorAll('*'))for(const pseudo of [null,'::before','::after']){const value=getComputedStyle(element,pseudo).backgroundImage;for(const match of value.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(match[1]);}window.__captureBackgroundFailures=[];await Promise.all([...urls].map(async url=>{const image=new Image();image.src=url;try{await image.decode()}catch{window.__captureBackgroundFailures.push(url)}}));window.scrollTo(0,0);return true})()`);
  if(settleMotion){
   await evaluate(`(async()=>{const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));for(let y=0;y<document.documentElement.scrollHeight;y+=Math.floor(innerHeight*.65)){scrollTo({top:y,behavior:'instant'});await frame()}scrollTo({top:0,behavior:'instant'});await frame();return true})()`);
   let settled=false;
   for(let attempt=0;attempt<160;attempt++){
    if(await evaluate(`!document.querySelector('[data-motion-state]:not([data-motion-state="complete"]),[data-counter-state]:not([data-counter-state="complete"])')&&!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect.getComputedTiming().endTime))`)){settled=true;break;}
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   if(!settled){
    const pending=await evaluate(`JSON.stringify([...document.querySelectorAll('[data-motion-state]:not([data-motion-state="complete"]),[data-counter-state]:not([data-counter-state="complete"])')].map(e=>({tag:e.tagName,classes:e.className,state:e.dataset.motionState,counter:e.dataset.counterState,top:e.getBoundingClientRect().top,height:e.offsetHeight})))`);
    throw new Error(`Normal motion did not finish: ${url.href}\n${pending}`);
   }
  }
  await new Promise(resolve=>setTimeout(resolve,200));
  const data=JSON.parse(await evaluate(`JSON.stringify({page:document.body.dataset.page,title:document.title,readyState:document.readyState,pendingMotion:document.querySelectorAll('[data-motion-state]:not([data-motion-state="complete"])').length,failedFonts:[...document.fonts].filter(e=>e.status==='error').map(e=>({family:e.family,weight:e.weight})),failedImages:[...document.images].filter(e=>!e.naturalWidth).map(e=>e.src),overflow:document.documentElement.scrollWidth>innerWidth,failedBackgrounds:window.__captureBackgroundFailures||[],sections:[...document.querySelectorAll('main>section,footer')].map(e=>({name:e.className,top:Math.round(e.getBoundingClientRect().top+scrollY),height:Math.round(e.offsetHeight)}))})`));
  const metrics=await send('Page.getLayoutMetrics');const height=Math.ceil(metrics.result.cssContentSize.height);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1920,height,scale:1}});
  await writeFile(resolve(output,`${page}.png`),Buffer.from(shot.result.data,'base64'));
  data.height=height;report.pages.push(data);console.log(`${page}: ${height}px, failed images ${data.failedImages.length}, failed fonts ${data.failedFonts.length}, overflow ${data.overflow}`);
 }
 await writeFile(resolve(output,'browser.json'),JSON.stringify(report,null,2)+'\n');
 if(errors.length||report.pages.some(p=>p.failedImages.length||p.failedBackgrounds.length||p.failedFonts.length||p.overflow||p.pendingMotion||p.readyState!=='complete'))process.exitCode=1;
}finally{socket.close();await fetch(`${cdp}/json/close/${tab.id}`);}
