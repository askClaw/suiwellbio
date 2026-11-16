const frame=document.querySelector('#fixture');
const status=document.querySelector('#status');
const results=document.querySelector('#results');
const assert=(value,message)=>{if(!value)throw Error(message);};
const tick=win=>new Promise(resolve=>win.requestAnimationFrame(resolve));
async function until(win,condition,message){const start=performance.now();while(!condition()){if(performance.now()-start>5000)throw Error(message);await tick(win);}}
async function load(page,width=1920,reduced=false){
  frame.style.width=`${width}px`;
  if(reduced){
    const html=await(await fetch(`../${page}.html`)).text();
    const bootstrap=`<base href="${location.origin}/"><script>const nativeMatch=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('prefers-reduced-motion')?{matches:true,addEventListener(){},removeEventListener(){}}:nativeMatch(q);<\/script>`;
    await new Promise(resolve=>{frame.onload=resolve;frame.srcdoc=html.replace('<head>','<head>'+bootstrap);});
  }else{
    frame.removeAttribute('srcdoc');
    await new Promise(resolve=>{frame.onload=resolve;frame.src=`../${page}.html`;});
  }
  const win=frame.contentWindow,doc=frame.contentDocument;
  await doc.fonts.ready;
  await until(win,()=>doc.querySelector('[data-motion-state]'),'页面交互未初始化');
  await tick(win);await tick(win);
  return {win,doc};
}
function pass(text){const item=document.createElement('li');item.textContent='通过：'+text;results.append(item);}
document.querySelector('#run').addEventListener('click',async event=>{
  event.target.disabled=true;results.replaceChildren();status.textContent='检查中…';
  try{
    let {win,doc}=await load('product');
    const bannerTitle=doc.querySelector('.page-banner h1');
    assert(bannerTitle.dataset.motionState==='running','内页首屏标题未播放入场');
    await until(win,()=>bannerTitle.dataset.motionState==='complete','首屏标题未完成入场');
    assert(win.getComputedStyle(bannerTitle).opacity==='1','首屏标题完成后仍隐藏');
    pass('内页首屏真实播放并在结束后释放动画');
    const top=id=>doc.getElementById(id).getBoundingClientRect().top+win.scrollY;
    assert(Math.abs(top('advantages')-1176)<12,'核心单元区高度偏差');
    assert(Math.abs(top('working-mode')-2086)<12,'优势区累计偏差');
    assert(Math.abs(top('parameters')-2530)<12,'流程区累计偏差');
    assert(Math.abs(doc.querySelector('.solution').getBoundingClientRect().top+win.scrollY-3621)<24,'方案区累计偏差');
    assert(doc.querySelectorAll('.parameter-grid>div').length===16,'参数卡片丢失');
    const parts=[...doc.querySelectorAll('.parameter-parts')];
    assert(parts.length===4 && parts.every(e=>e.querySelectorAll('.parameter-label').length===2),'复合参数标签丢失');
    pass('1920px产品页锚点与16组参数结构');
    const cards=[...doc.querySelectorAll('.advantage-grid article')];
    win.scrollTo(0,top('advantages')+190);
    await until(win,()=>cards[0].dataset.motionState==='running','卡片未开始入场');
    const delays=cards.slice(0,3).map(e=>e.getAnimations()[0]?.effect.getTiming().delay);
    assert(JSON.stringify(delays)==='[0,70,140]',`错峰延迟异常：${delays}`);
    await until(win,()=>cards.slice(0,3).every(e=>e.dataset.motionState==='complete'),'卡片未完成');
    pass('同行卡片实际错峰为0/70/140ms并完成显示');
    const flow=doc.querySelector('.work-flow'),steps=[...flow.children];
    win.scrollTo(0,top('working-mode')+140);
    await until(win,()=>steps.some(step=>step.dataset.motionState==='running'),'工作流程未逐项入场');
    steps[0].focus();
    assert(steps[0].dataset.motionState==='complete','键盘聚焦后流程内容仍隐藏');
    await until(win,()=>steps.every(step=>step.dataset.motionState==='complete'),'流程步骤未完成入场');
    pass('流程逐项入场，键盘聚焦立即显示步骤');
    ({win,doc}=await load('service'));
    const details=[...doc.querySelectorAll('.faq-item')],last=details[3],form=last.querySelector('form'),extra=form.querySelector('.feedback-extra');
    assert(extra.hidden,'默认意见框应折叠');
    const panel=form.closest('.feedback-panel');assert(!panel.open,'默认反馈面板应折叠');panel.querySelector('summary').click();assert(panel.open,'反馈面板无法展开');
    form.querySelector('[value="no"]').click();assert(!extra.hidden,'负反馈未展开意见');
    const input=form.querySelector('textarea');input.value='需要更详细的安装说明';
    form.querySelector('[value="yes"]').click();assert(extra.hidden && input.value,'切换评价丢失意见');
    form.querySelector('.feedback-toggle').click();assert(!extra.hidden && input.value,'好评不能补充意见');
    details[0].querySelector('summary').click();await tick(win);
    last.querySelector('summary').click();form.querySelector('.feedback-toggle').click();
    await until(win,()=>!last.getAnimations().length && !details[0].getAnimations().length,'FAQ动画未释放');
    assert(last.open && !details[0].open,'FAQ快速切换终态错误');
    assert(input.value==='需要更详细的安装说明','切换问题丢失草稿');
    form.requestSubmit();assert(form.dataset.feedbackState==='recorded','记录反馈失败');
    assert(form.querySelector('.feedback-status').textContent.includes('尚未发送'),'缺少静态反馈提示');
    assert(!last.style.height && last.offsetHeight>=last.scrollHeight,'FAQ残留高度或截断');
    pass('FAQ渐进展开、好评补充、草稿保留、快速切换和静态记录');
    for(const width of [1920,1280,761,760,390,360]){
      for(const page of ['about','product','process','service','news','news-detail','contact']){
        ({win,doc}=await load(page,width));
        assert(doc.documentElement.scrollWidth<=width,`${page}在${width}px溢出`);
        assert([...doc.images].every(img=>!img.complete || img.naturalWidth>0),`${page}图片加载失败`);
        if(page==='product' && width<=390){
          const flow=doc.querySelector('.work-flow'),nodes=[...flow.children];
          assert(win.getComputedStyle(flow).gridTemplateColumns.split(' ').length===1,'手机流程未纵向排列');
          assert(win.getComputedStyle(flow,'::before').display!=='none','手机流程缺少连接线');
          assert(nodes.every((e,i)=>!i || e.offsetTop>nodes[i-1].offsetTop),'手机流程顺序错误');
          for(const e of doc.querySelectorAll('.parameter-grid>div')) assert(e.scrollWidth<=e.clientWidth,'手机参数卡片溢出');
        }
      }
    }
    pass('七个内页在1920/1280/761/760/390/360px无横向溢出，手机流程与参数可读');
    ({win,doc}=await load('product',390,true));
    assert([...doc.querySelectorAll('[data-motion-state]')].every(e=>e.dataset.motionState==='complete'),'减少动态效果仍隐藏内容');
    assert(doc.getAnimations().length===0,'减少动态效果仍播放入场');
    pass('减少动态效果直接显示全部内容');
    status.textContent=`全部通过：${results.children.length}项内页浏览器回归`;
  }catch(error){status.textContent='检查失败：'+error.message;}
  finally{event.target.disabled=false;}
});
