const frame=document.querySelector('#fixture'),status=document.querySelector('#status'),results=document.querySelector('#results');
const assert=(value,message)=>{if(!value)throw Error(message);};
const tick=win=>new Promise(resolve=>win.requestAnimationFrame(resolve));
async function until(win,condition,message){const start=performance.now();while(!condition()){if(performance.now()-start>6000)throw Error(message);await tick(win);}}
async function load(page,mode='normal',width=1280){
 frame.style.width=`${width}px`;
 frame.removeAttribute('srcdoc');frame.removeAttribute('sandbox');
 if(mode==='normal') await new Promise(resolve=>{frame.onload=resolve;frame.src=`../${page}.html`;});
 else {
  let html=await(await fetch(`../${page}.html`)).text();
  html=html.replace('<head>',`<head><base href="${location.origin}/">`);
  if(mode==='failed') html=html.replace('src="app.js"','src="tests/missing-entry.js"');
  else html=html.replace(/<script src="app.js" type="module"><\/script>/,'');
  if(mode==='no-script') frame.setAttribute('sandbox','allow-same-origin');
  await new Promise(resolve=>{frame.onload=resolve;frame.srcdoc=html;});
 }
 const win=frame.contentWindow,doc=frame.contentDocument;
 await doc.fonts.ready;
 if(mode==='normal') await until(win,()=>doc.querySelector('[data-motion-state]'),'页面未初始化');
 return {win,doc};
}
function pass(text){const li=document.createElement('li');li.textContent='通过：'+text;results.append(li);}
async function activate(win,doc){
 await new Promise((resolve,reject)=>{const script=doc.createElement('script');script.type='module';script.src='/app.js';script.onload=resolve;script.onerror=reject;doc.head.append(script);});
 assert([...doc.querySelectorAll('.consultation-form,.faq-feedback')].every(form=>form.dataset.ready==='true'),'初始化后未就绪');
}
function forbidRequests(win){
 const calls=[];const nativeFetch=win.fetch.bind(win),nativeOpen=win.XMLHttpRequest.prototype.open;
 win.fetch=(...args)=>{calls.push(args[0]);return nativeFetch(...args);};
 win.XMLHttpRequest.prototype.open=function(...args){calls.push(args[1]);return nativeOpen.apply(this,args);};
 return calls;
}
async function assertNoNavigation(win,action){
 const before=win.location.href;let navigated=false;const listener=()=>{navigated=true;};
 frame.addEventListener('load',listener);
 try{action();await tick(win);await tick(win);assert(!navigated && frame.contentWindow.location.href===before,'表单发生原生导航');}
 finally{frame.removeEventListener('load',listener);}
}
document.querySelector('#run').addEventListener('click',async event=>{
 event.target.disabled=true;results.replaceChildren();status.textContent='检查中…';
 try{
  for(const width of [1920,390,360]) for(const page of ['contact','service']) for(const mode of ['no-script','failed','delayed']){
   const {win,doc}=await load(page,mode,width);
   const forms=[...doc.querySelectorAll('.consultation-form,.faq-feedback')];
   assert(forms.length>0,'缺少静态表单');
   for(const form of forms){
    assert([...form.querySelectorAll('input,textarea,button')].every(e=>e.disabled),'未初始化表单存在可用控件');
    assert([...new win.FormData(form)].length===0,'禁用表单仍序列化用户字段');
    const button=form.querySelector('[type="submit"]');
    await assertNoNavigation(win,()=>button.click());
    const input=form.querySelector('input');input.focus();assert(doc.activeElement!==input,'未初始化输入可聚焦');
   }
   assert(doc.documentElement.scrollWidth<=width,'默认禁用状态横向溢出');
   assert([...doc.querySelectorAll('a')].some(e=>e.href.startsWith('tel:')),'缺少电话入口');
   if(page==='service'){
    const details=doc.querySelector('.faq-item');details.querySelector('summary').click();assert(details.open,'默认FAQ正文不能展开');
   }
   if(mode==='delayed'){
    // Values restored before enhancement must survive activation.
    const input=forms[0].querySelector(page==='service'?'input[value="no"]':'input');
    if(input.type==='radio') input.checked=true;else input.value='Review Tester';
    await activate(win,doc);assert(input.type==='radio'?input.checked:input.value==='Review Tester','初始化清空已有值');
    assert([...doc.querySelectorAll('[data-static-control]')].every(e=>!e.disabled),'初始化后控件仍禁用');
    if(page==='service') assert(!forms[0].querySelector('.feedback-extra').hidden,'恢复的负反馈没有展开意见');
   }
  }
  pass('两类表单在无脚本、入口失败、延迟初始化及1920/390/360px下默认不可提交，启用后保留值');
  let {win,doc}=await load('contact');const form=doc.querySelector('form.consultation-form'),calls=forbidRequests(win);
  const values={name:'Review Tester',company:'Example Test',phone:'+1 202 555 0123',email:'review@example.invalid',requirements:'Synthetic regression test',verification:'0000'};
  Object.entries(values).forEach(([name,value])=>{form.elements[name].value=value;form.elements[name].dispatchEvent(new win.Event('input',{bubbles:true}));});
  await assertNoNavigation(win,()=>form.requestSubmit());assert(form.querySelector('.form-status').textContent.includes('不匹配'),'错误校验码未识别');
  form.elements.verification.value=doc.querySelector('.verification-code').textContent;
  await assertNoNavigation(win,()=>form.requestSubmit());assert(form.querySelector('.form-status').textContent.includes('未发送'),'正常校验未完成');
  assert(calls.length===0,'静态联系表单产生请求');
  doc.querySelector('.verification-code').click();assert(!form.elements.verification.value,'演示码刷新未清空输入');
  pass('联系表单错误/正确校验与刷新正常，提交不导航且无fetch/XHR请求');
  ({win,doc}=await load('service'));const feedback=doc.querySelector('.faq-item[open] form'),feedbackCalls=forbidRequests(win);
  feedback.querySelector('[value="no"]').click();feedback.querySelector('textarea').value='Synthetic FAQ review';
  await assertNoNavigation(win,()=>feedback.requestSubmit());assert(feedback.dataset.feedbackState==='recorded','反馈未记录');
  assert(feedbackCalls.length===0,'静态反馈产生请求');
  pass('FAQ反馈记录不导航且无fetch/XHR请求');
  ({win,doc}=await load('news'));
  for(let index=0;index<100;index++){
   const category=index%2?'company':'market';
   doc.querySelector(`[data-news-category="${category}"]`).click();
   assert(new URL(win.location.href).searchParams.get('category')===category,'分类URL异常');
   assert(doc.querySelector(`[data-news-category="${category}"]`).hasAttribute('aria-current'),'分类高亮未更新');
   const cards=[...doc.querySelectorAll('[data-news-card]')];
   assert(cards.length===2 && cards.every(e=>e.getBoundingClientRect().height>0),'分类卡片异常');
   await tick(win);
  }
  // Exercise popstate rendering here; trusted browser Back/Forward is checked
  // separately, since synthetic iframe clicks do not grant history activation.
  for(const category of ['market','company']){
   win.history.replaceState(null,'',`news.html?category=${category}&page=1`);
   win.dispatchEvent(new win.PopStateEvent('popstate'));
   assert(doc.querySelector(`[data-news-category="${category}"]`).hasAttribute('aria-current'),'popstate未恢复高亮');
  }
  doc.querySelector('.news-card-link').focus();assert(doc.activeElement.matches('.news-card-link'),'卡片无法键盘聚焦');
  const context=await new Promise(resolve=>{win.addEventListener('regression-context',event=>resolve(event.detail),{once:true});const script=doc.createElement('script');script.type='module';script.textContent="import * as context from '/common.js';window.dispatchEvent(new CustomEvent('regression-context',{detail:context}));";doc.head.append(script);});
  const makeCard=id=>{const card=doc.createElement('article');card.id=id;card.style.cssText='height:250px;margin-top:1500px';card.textContent='Disposable regression card';doc.querySelector('#news-results').append(card);context.registerEntrances('#'+id);return card;};
  const pending=makeCard('pending-regression');assert(pending.dataset.motionState==='pending','未创建待入场目标');
  doc.querySelector('[data-news-category="market"]').click();assert(!pending.isConnected && !pending.hasAttribute('data-motion-state'),'待入场旧节点未注销');
  const running=makeCard('running-regression');win.scrollTo(0,running.getBoundingClientRect().top+win.scrollY-200);
  await until(win,()=>running.dataset.motionState==='running','未创建运行中目标');
  doc.querySelector('[data-news-category="company"]').click();
  assert(!running.isConnected && running.getAnimations().length===0 && !running.hasAttribute('data-motion-state'),'运行中旧目标未清理');
  await tick(win);await tick(win);assert(!running.hasAttribute('data-motion-state'),'旧观察回调重新注册节点');
  pass('100次分类切换、popstate恢复、键盘聚焦、待入场及运行中卡片替换正常');
  status.textContent=`全部通过：${results.children.length}组静态表单与注册清理回归`;
 }catch(error){status.textContent='检查失败：'+error.message;}
 finally{event.target.disabled=false;}
});
