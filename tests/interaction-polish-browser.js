const frame=document.querySelector('#fixture'),status=document.querySelector('#status'),results=document.querySelector('#results');
const assert=(value,message)=>{if(!value)throw Error(message);};
const tick=win=>new Promise(resolve=>win.requestAnimationFrame(resolve));
async function until(win,condition,message){const start=performance.now();while(!condition()){if(performance.now()-start>6500)throw Error(message);await tick(win);}}
function pass(text){const item=document.createElement('li');item.textContent='通过：'+text;results.append(item);}
async function load(page,defer=false){
 frame.removeAttribute('srcdoc');
 if(defer){
  let html=await(await fetch(`../${page}.html`)).text();
  html=html.replace('<head>',`<head><base href="${location.origin}/">`).replace('<script src="app.js" type="module"></script>','');
  await new Promise(resolve=>{frame.onload=resolve;frame.srcdoc=html;});
 }else await new Promise(resolve=>{frame.onload=resolve;frame.src=`../${page}.html`;});
 return {win:frame.contentWindow,doc:frame.contentDocument};
}
async function activate(doc){
 await new Promise((resolve,reject)=>{const script=doc.createElement('script');script.type='module';script.src='/app.js';script.onload=resolve;script.onerror=reject;doc.head.append(script);});
}
document.querySelector('#run').addEventListener('click',async event=>{
 event.target.disabled=true;results.replaceChildren();status.textContent='检查中…';
 try{
  let {win,doc}=await load('product',true);
  const heading=doc.querySelector('.page-banner h1'),card=doc.querySelector('.core-unit');
  assert(win.__suiwellMotionBoot.mode==='preparing','首屏没有提前准备入场');
  assert(win.getComputedStyle(heading).opacity==='0'&&win.getComputedStyle(card).opacity==='0','脚本未就绪时内容提前显示');
  assert(win.getComputedStyle(doc.querySelector('header')).opacity==='1','导航不应随内容隐藏');
  await activate(doc);
  assert(heading.dataset.motionState==='running'&&Number(win.getComputedStyle(heading).opacity)<.25,'初始化出现先显示再隐藏的闪跳');
  await until(win,()=>heading.dataset.motionState==='complete','标题入场未完成');
  assert(win.getComputedStyle(heading).opacity==='1'&&win.__suiwellMotionBoot.mode==='ready','入场完成后仍未显示');
  pass('模块就绪前标题和卡片已隐藏，初始化直接入场，导航始终可见');

  ({win,doc}=await load('product',true));
  await until(win,()=>win.__suiwellMotionBoot.mode==='fallback','入口失败没有恢复静态内容');
  assert(win.getComputedStyle(doc.querySelector('.page-banner h1')).opacity==='1','回退后正文仍隐藏');
  await activate(doc);
  assert(doc.querySelector('.page-banner h1').dataset.motionState==='complete','迟到的模块又重新播放入场');
  assert(doc.getAnimations().every(a=>a.playState!=='running'),'回退后初始化仍产生闪跳动画');
  pass('入口失败可恢复可读内容，迟到的模块不再让页面跳回动画起点');

  for(const page of ['product','service','contact','news']){
   ({win,doc}=await load(page));
   for(const element of doc.querySelectorAll('a[href]:not([aria-disabled="true"]),button:not(:disabled),summary,input[type="radio"]:not(:disabled)')){
    assert(win.getComputedStyle(element).cursor==='pointer',`${page}可点击元素不是手型：${element.tagName}.${element.className}`);
   }
   assert(win.getComputedStyle(doc.querySelector('input[type="search"]')).cursor!=='pointer','文本输入不应变成手型');
  }
  pass('导航、按钮、FAQ、分页和单选控件使用手型，文本输入保留编辑光标');

  frame.style.height='720px';
  ({win,doc}=await load('index'));
  await doc.fonts.ready;
  const number=doc.querySelector('.metric-grid strong'),label=doc.querySelector('.metric-grid>div>span');
  win.scrollTo({top:number.getBoundingClientRect().top+win.scrollY-150,behavior:'instant'});
  await until(win,()=>number.dataset.counterState==='running'&&number.querySelector('.metric-value').textContent==='50%+','未观察到最后一个计数帧');
  const text=number.querySelector('.counter-svg text'),box=number.getBoundingClientRect(),labelBox=label.getBoundingClientRect();
  const canvas=doc.createElement('canvas').getContext('2d'),style=win.getComputedStyle(text);
  canvas.font=`700 ${style.fontSize} MetricCounter`;
  const matrix=text.getScreenCTM(),metrics=canvas.measureText(text.textContent);
  const inkTop=matrix.f+matrix.d*(Number(text.getAttribute('y'))-metrics.actualBoundingBoxAscent);
  assert(Math.abs(matrix.a-1)<.001&&Math.abs(matrix.d-1)<.001,'SVG画布被网格布局缩放，数字大小与终态不同');
  await until(win,()=>number.dataset.counterState==='complete','数字计数未结束');
  const finalBox=number.getBoundingClientRect(),sprite=win.getComputedStyle(number,'::after');
  assert(Math.abs(inkTop-(finalBox.top+parseFloat(sprite.top)))<=1,'计数帧与原稿终态的可见字形基线不同');
  assert(finalBox.top===box.top&&finalBox.height===box.height&&label.getBoundingClientRect().top===labelBox.top,'计数结束造成整块数字或标签跳动');
  pass('最后计数帧与PSD终态字形对齐，数字容器和标签位置保持不变');
  status.textContent=`全部通过：${results.children.length}组数字与初始化回归`;
 }catch(error){status.textContent='检查失败：'+error.message;}
 finally{event.target.disabled=false;}
});
