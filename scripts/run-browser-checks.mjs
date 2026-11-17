const cdp=process.env.CHROME_CDP||'http://127.0.0.1:9228';
const base=(process.argv[2]||'http://127.0.0.1:5173/').replace(/\/?$/,'/');
const tab=await(await fetch(`${cdp}/json/new?about:blank`,{method:'PUT'})).json();
const socket=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
let id=0;const calls=new Map();
socket.addEventListener('message',event=>{const message=JSON.parse(event.data),call=calls.get(message.id);if(!call)return;clearTimeout(call.timer);calls.delete(message.id);call.resolve(message);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{calls.delete(key);reject(new Error(`CDP timed out: ${method}`));},15000);calls.set(key,{resolve,timer});socket.send(JSON.stringify({id:key,method,params}));});
const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true});if(response.result.exceptionDetails)throw new Error(response.result.exceptionDetails.text);return response.result.result.value;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 for(const suite of ['inner-browser','motion-browser','static-lifecycle-browser']){
  await send('Page.navigate',{url:new URL(`tests/${suite}.html`,base).href});
  await send('Page.bringToFront');
  let ready=false;
  for(let i=0;i<100;i++){await wait(100);if(await evaluate('!!document.querySelector("#run")')){ready=true;break;}}
  if(!ready)throw new Error(`Missing test runner: ${suite}`);
  await evaluate('document.querySelector("#run").click()');
  let complete=false;
  for(let i=0;i<180;i++){
   await wait(500);
   const result=await evaluate('({status:document.querySelector("#status")?.textContent,results:document.querySelector("#results")?.innerText})');
   if(/失败|failed/i.test(result.status||''))throw new Error(`${suite}: ${result.status}\n${result.results}`);
   if(/全部通过/.test(result.status||'')){console.log(`${suite}: ${result.status}\n${result.results}`);complete=true;break;}
  }
  if(!complete)throw new Error(`Browser suite timed out: ${suite}`);
 }
}finally{socket.close();await fetch(`${cdp}/json/close/${tab.id}`);}
