import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base=(process.argv[2]||'http://127.0.0.1:5173/').replace(/\/?$/,'/');
const output=resolve(process.argv[3]||'.design/precision-review/local');
const cdp=process.env.CHROME_CDP||'http://127.0.0.1:9228';
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
await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const report={base,viewport:[1920,1080],pages:[],errors};
try{
 for(const page of pages){
  await send('Page.navigate',{url:new URL(`${page}.html`,base).href});
  await new Promise(resolve=>setTimeout(resolve,1200));
  await evaluate(String.raw`(async()=>{document.querySelectorAll('img').forEach(e=>e.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(e=>e.decode().catch(()=>{})));const urls=new Set();for(const element of document.querySelectorAll('*'))for(const pseudo of [null,'::before','::after']){const value=getComputedStyle(element,pseudo).backgroundImage;for(const match of value.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(match[1]);}window.__captureBackgroundFailures=[];await Promise.all([...urls].map(async url=>{const image=new Image();image.src=url;try{await image.decode()}catch{window.__captureBackgroundFailures.push(url)}}));window.scrollTo(0,0);return true})()`);
  await new Promise(resolve=>setTimeout(resolve,200));
  const data=JSON.parse(await evaluate(`JSON.stringify({page:document.body.dataset.page,title:document.title,failedImages:[...document.images].filter(e=>!e.naturalWidth).map(e=>e.src),overflow:document.documentElement.scrollWidth>innerWidth,failedBackgrounds:window.__captureBackgroundFailures||[],sections:[...document.querySelectorAll('main>section,footer')].map(e=>({name:e.className,top:Math.round(e.getBoundingClientRect().top+scrollY),height:Math.round(e.offsetHeight)}))})`));
  const metrics=await send('Page.getLayoutMetrics');const height=Math.ceil(metrics.result.cssContentSize.height);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1920,height,scale:1}});
  await writeFile(resolve(output,`${page}.png`),Buffer.from(shot.result.data,'base64'));
  data.height=height;report.pages.push(data);console.log(`${page}: ${height}px, failed images ${data.failedImages.length}, overflow ${data.overflow}`);
 }
 await writeFile(resolve(output,'browser.json'),JSON.stringify(report,null,2)+'\n');
 if(errors.length||report.pages.some(p=>p.failedImages.length||p.failedBackgrounds.length||p.overflow))process.exitCode=1;
}finally{socket.close();await fetch(`${cdp}/json/close/${tab.id}`);}
