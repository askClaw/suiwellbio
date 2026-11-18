import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base=(process.argv[2]||'http://127.0.0.1:5173/').replace(/\/?$/,'/');
const output=resolve(process.argv[3]||'.design/floating-tools/local');
const cdp=process.env.CHROME_CDP||'http://127.0.0.1:9228';
const tab=await(await fetch(`${cdp}/json/new?about:blank`,{method:'PUT'})).json();
const socket=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const calls=new Map(),errors=[],checks=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  if(calls.has(message.id)){calls.get(message.id)(message);calls.delete(message.id);}
});
const send=(method,params={})=>new Promise(resolve=>{const key=++id;calls.set(key,resolve);socket.send(JSON.stringify({id:key,method,params}));});
const evaluate=async expression=>{
  const response=await send('Runtime.evaluate',{expression,returnByValue:true});
  if(response.result.exceptionDetails)throw Error(response.result.exceptionDetails.text);
  return response.result.result.value;
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message,timeout=6000){
  const start=Date.now();
  while(!await evaluate(expression)){if(Date.now()-start>timeout)throw Error(message);await wait(30);}
}
function assert(value,message){if(!value)throw Error(message);}
const rect=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);
const move=(x,y)=>send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
async function crop(phase,width){
  const box=await rect('.floating-tools');
  const scroll=await evaluate('scrollY');
  const shot=await send('Page.captureScreenshot',{format:'png',clip:{x:width-320,y:scroll+box.top-20,width:320,height:box.height+40,scale:1}});
  await writeFile(resolve(output,`${phase}.png`),Buffer.from(shot.result.data,'base64'));
}
try{
  await mkdir(output,{recursive:true});
  await send('Page.enable');await send('Runtime.enable');
  await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  for(const [page,width] of [...['index','about','product','process','service','news','news-detail','contact'].map(page=>[page,1920]),['index',1280],['index',390],['contact',390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:false});
    await move(0,0);
    const url=new URL(`${page}.html`,base);
    await send('Page.navigate',{url:url.href});await send('Page.bringToFront');
    await until(`location.pathname===${JSON.stringify(url.pathname)}&&document.readyState==='complete'`,'Page did not load',60000);
    await evaluate('scrollTo({top:0,behavior:"instant"});document.activeElement?.blur()');
    const size=width<=760?40:55,expanded=width<=760?177:243;
    await until(`Math.abs(document.querySelector('.phone').getBoundingClientRect().width-${size})<.1`,'Phone is expanded by default');
    const before=await rect('.floating-tools');
    assert(await evaluate("getComputedStyle(document.querySelector('.floating-tools')).position==='fixed'"),'Toolbar is not fixed');
    assert(await evaluate("getComputedStyle(document.querySelector('.floating-tools a')).display!=='none'"),'Contact icon hidden');
    assert(await evaluate("document.querySelector('.floating-tools .phone').getAttribute('href')==='tel:+8613817002275'"),'Incorrect telephone destination');
    assert(await evaluate(`(() => {
      const phone=document.querySelector('.floating-tools .phone');
      const label=phone.querySelector('.tool-tip'), icon=phone.querySelector('.icon');
      return getComputedStyle(icon).display!=='none' && getComputedStyle(phone).backgroundImage==='none'
        && getComputedStyle(phone,'::before').content==='none'
        && label.textContent.replace(/[^+0-9]/g,'')===phone.href.slice(4);
    })()`),'Phone uses two icons or its visible number differs from the dial link');
    await evaluate('scrollTo({top:850,behavior:"instant"})');
    await until("getComputedStyle(document.querySelector('.floating-tools a[href=\"#top\"]')).opacity==='1'",'Back-to-top did not appear');
    const after=await rect('.floating-tools');
    assert(before.top===after.top&&before.right===after.right,'Toolbar moved with the document');
    if(page==='index'&&width===1920)await crop('collapsed',width);
    const phone=await rect('.floating-tools .phone');
    await move(phone.left+phone.width/2,phone.top+phone.height/2);
    if(page==='index'&&[1920,390].includes(width)){
      const mid=await evaluate(`(() => {
        const phone=document.querySelector('.floating-tools .phone');
        getComputedStyle(phone).width;
        const effects=phone.getAnimations({subtree:true});
        effects.forEach(effect=>{effect.pause();effect.currentTime=90;});
        const box=phone.getBoundingClientRect();
        return [box.width,box.right,getComputedStyle(phone.querySelector('.tool-tip')).opacity];
      })()`);
      assert(mid[0]>size&&mid[0]<expanded&&mid[1]===phone.right&&mid[2]==='0','Phone label appeared before the capsule was wide enough');
      if(width===1920)await crop('expanding',width);
      await evaluate("document.querySelector('.floating-tools .phone').getAnimations({subtree:true}).forEach(effect=>effect.play())");
    }
    await until(`Math.abs(document.querySelector('.phone').getBoundingClientRect().width-${expanded})<.1`,'Hover did not expand phone');
    const open=await rect('.floating-tools .phone');
    assert(open.right===phone.right,'Expansion moved the screen edge');
    const label=await rect('.floating-tools .phone .tool-tip');
    assert(label.left>=open.left&&label.right<open.right,'Expanded capsule clips the phone number');
    await move(open.left+10,open.top+open.height/2);await wait(450);
    assert(Math.abs((await rect('.phone')).width-expanded)<.1,'Expanded part is not hoverable');
    if(page==='index'&&width===1920)await crop('expanded',width);
    await move(0,0);
    await until(`Math.abs(document.querySelector('.phone').getBoundingClientRect().width-${size})<.1`,'Phone did not collapse on leave');
    await evaluate("document.querySelector('.floating-tools a').focus()");
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await until(`document.activeElement.matches('.floating-tools .phone')&&Math.abs(document.activeElement.getBoundingClientRect().width-${expanded})<.1`,'Keyboard focus did not expand phone');
    await evaluate('document.activeElement.blur()');
    const top=await rect('.floating-tools a[href="#top"]');
    await move(top.left+top.width/2,top.top+top.height/2);
    for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:top.left+top.width/2,y:top.top+top.height/2,button:'left',clickCount:1});
    await until('scrollY===0','Back-to-top click failed');
    assert(await evaluate('document.documentElement.scrollWidth===innerWidth'),'Horizontal overflow');
    checks.push({page,width,collapsed:size,expanded,fixed:true,hover:true,keyboard:true,backToTop:true});
    console.log(`${page} ${width}px: collapsed, hover, leave, keyboard, fixed scroll and back-to-top passed`);
  }
  assert(!errors.length,errors.join('\n'));
  await writeFile(resolve(output,'checks.json'),JSON.stringify({base,checks,errors},null,2)+'\n');
}finally{socket.close();await fetch(`${cdp}/json/close/${tab.id}`);}
