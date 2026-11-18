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
  for (const width of [1920,390]) {
    frame.style.width=`${width}px`;
    ({win,doc}=await load('index'));
    await doc.fonts.ready;
    const numbers=[...doc.querySelectorAll('[data-counter-renderer="svg"]')];
    win.scrollTo({top:numbers[0].getBoundingClientRect().top+win.scrollY-150,behavior:'instant'});
    await until(win,()=>numbers.every(number=>number.dataset.counterState==='running'&&number.querySelector('.metric-value').textContent===number.getAttribute('aria-label')),'未观察到最后一个计数帧');
    const glyphs=numbers.map(number=>number.querySelector('.counter-svg text'));
    const numberPositions=()=>[...numbers,...numbers.map(number=>number.nextElementSibling),...glyphs].map(element=>{
      const {x,y,width,height}=element.getBoundingClientRect();
      const {fontSize,fontWeight}=win.getComputedStyle(element);
      return [x,y,width,height,fontSize,fontWeight];
    });
    const before=numberPositions();
    assert(glyphs.every(text=>Math.abs(text.getScreenCTM().a-1)<.001&&Math.abs(text.getScreenCTM().d-1)<.001),`${width}px时SVG画布被网格布局缩放`);
    await until(win,()=>numbers.every(number=>number.dataset.counterState==='complete'),'数字计数未结束');
    assert(JSON.stringify(before)===JSON.stringify(numberPositions()),'数字或标签在计数完成时改变位置或字号');
    assert(numbers.every((number,index)=>number.querySelector('.counter-svg text')===glyphs[index]&&win.getComputedStyle(number.querySelector('.metric-value')).opacity==='1'&&win.getComputedStyle(number,'::after').content==='none'),'计数结束更换了字形渲染');
  }
  pass('桌面与手机两项百分比均以1:1渲染，最后计数帧和终态的字号、字重与位置一致');

  ({win,doc}=await load('index'));
  const menu=doc.querySelector('#main-nav'), menuButton=doc.querySelector('.menu-toggle');
  menuButton.click();
  await until(win,()=>menu.dataset.state==='open','菜单未打开');
  menuButton.click();
  const exit=menu.getAnimations()[0];
  exit.pause();exit.currentTime=75;
  const closingOpacity=Number(win.getComputedStyle(menu).opacity);
  menuButton.click();
  const openingFrame=menu.getAnimations()[0].effect.getKeyframes()[0];
  assert(closingOpacity>.25&&Math.abs(Number(openingFrame.opacity)-closingOpacity)<.03,'菜单反向时闪回透明起点');
  const search=doc.querySelector('.search-toggle'),panel=doc.querySelector('.search-panel');
  const hero=doc.querySelector('.hero');
  const heroY=hero.getBoundingClientRect().y;
  search.click();
  assert(!panel.hidden&&doc.activeElement.id==='site-search'&&hero.getBoundingClientRect().y===heroY,'搜索打开时推动了正文或丢失焦点');
  doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape'}));
  await until(win,()=>panel.hidden,'搜索未关闭');
  assert(doc.activeElement===search&&hero.getBoundingClientRect().y===heroY,'搜索关闭时推动了正文或未恢复焦点');
  pass('手机菜单反向操作从当前透明度续播，搜索浮层开合不推动正文');

  ({win,doc}=await load('service'));
  const last=doc.querySelector('.faq-item:last-child');
  const feedback=last.querySelector('.feedback-panel');
  const measure=()=>last.getBoundingClientRect().height;
  const closedHeight=measure();
  feedback.querySelector('summary').click();
  const expansion=last.getAnimations().find(animation=>animation.effect.getKeyframes()[0].height);
  assert(feedback.open&&Math.abs(measure()-closedHeight)<1&&expansion,'反馈面板没有从当前高度展开');
  expansion.pause();expansion.currentTime=90;
  const halfHeight=measure();
  feedback.querySelector('summary').click();
  assert(!feedback.open&&Math.abs(measure()-halfHeight)<1,'反馈面板反向操作发生高度跳变');
  await until(win,()=>last.getAnimations().length===0,'反馈高度动画未清理');
  assert(Math.abs(measure()-closedHeight)<1,'反馈关闭后未恢复高度');

  const download=doc.querySelector('[data-download-pending]'),dialog=doc.querySelector('dialog');
  for(const dismiss of [
    ()=>dialog.querySelector('.dialog-close').click(),
    ()=>dialog.dispatchEvent(new win.Event('cancel',{cancelable:true})),
    ()=>dialog.dispatchEvent(new win.MouseEvent('click',{bubbles:true,clientX:0,clientY:0}))
  ]){
    download.focus({preventScroll:true});download.click();
    assert(dialog.open&&doc.body.classList.contains('dialog-open')&&dialog.getAnimations()[0].effect.getKeyframes().every(frame=>!('scale' in frame)),'下载弹窗未走共用动画或仍在缩放文字');
    dismiss();
    await until(win,()=>!dialog.open,'下载弹窗未关闭');
    assert(doc.activeElement===download&&!doc.body.classList.contains('dialog-open'),'关闭弹窗后未恢复焦点或页面滚动');
  }
  pass('FAQ反馈从当前高度展开和反向收起，下载弹窗三种关闭入口均收尾');

  frame.style.width='1920px';
  ({win,doc}=await load('news'));
  await doc.fonts.ready;
  const pageControls=()=>[...doc.querySelector('.pagination').children].map(element=>{
    const {x,y,width,height}=element.getBoundingClientRect();
    const {fontSize,fontWeight}=win.getComputedStyle(element);
    return [x,y+win.scrollY,width,height,fontSize,fontWeight];
  });
  const firstPage=pageControls();
  doc.querySelector('[data-news-page="2"]').click();
  assert(doc.querySelector('.pagination [aria-current]').textContent==='2'&&JSON.stringify(firstPage)===JSON.stringify(pageControls()),'切到第2页时分页按钮移动或缩放');
  doc.querySelector('[data-news-page="1"]').click();
  assert(JSON.stringify(firstPage)===JSON.stringify(pageControls()),'切回第1页时分页按钮移动或缩放');
  pass('桌面新闻分页切换前后位置、尺寸、字号和字重一致');
  status.textContent=`全部通过：${results.children.length}组交互与动效回归`;
 }catch(error){status.textContent='检查失败：'+error.message;}
 finally{event.target.disabled=false;}
});
