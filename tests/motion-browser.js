const frame = document.querySelector('#fixture');
const button = document.querySelector('#run');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function passed(message) { const li = document.createElement('li'); li.textContent = '通过：' + message; results.append(li); }
const nextFrame = win => new Promise(resolve => win.requestAnimationFrame(resolve));
async function waitFor(win, condition, message) {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 4000) throw new Error(message);
    await nextFrame(win);
  }
}
button.addEventListener('click', async () => {
  button.disabled = true; results.replaceChildren(); status.textContent = '检查中…';
  try {
    await new Promise(resolve => { frame.onload = resolve; frame.src = '../index.html'; });
    const win = frame.contentWindow, doc = frame.contentDocument;
    assert(!win.matchMedia('(prefers-reduced-motion: reduce)').matches, '此组浏览器检查需要允许动态效果；减少动态效果另有核心回归覆盖。');
    doc.documentElement.style.scrollBehavior = 'auto';
    let hidden = false;
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => hidden });
    function visibility(value) { hidden = value; doc.dispatchEvent(new win.Event('visibilitychange')); }
    const pending = [...doc.querySelectorAll('[data-motion-state="pending"]')];
    assert(pending.length > 0, '缺少待入场的真实页面目标');
    const pendingValues = [...doc.querySelectorAll('.metric-value')].slice(0, 2).map(element => element.textContent);
    visibility(true);
    assert(pending.every(element => element.dataset.motionState === 'pending'), '切入后台消耗了未播放的入场目标');
    assert([...doc.querySelectorAll('.metric-value')].slice(0, 2).every((element, i) => element.textContent === pendingValues[i]), '切入后台消耗了未播放的数字计数');
    passed('后台切换保留待播放的入场目标和计数器');

    const cards = [...doc.querySelectorAll('.news-grid article')];
    win.scrollTo(0, doc.querySelector('.news-grid').getBoundingClientRect().top + win.scrollY - 170);
    await nextFrame(win); await nextFrame(win); await nextFrame(win);
    assert(cards.every(element => element.dataset.motionState === 'pending'), '后台滚动仍然触发了入场');
    visibility(false);
    assert(cards.every(element => element.dataset.motionState === 'running'), '返回前台没有恢复当前可见目标');
    // This runs synchronously inside the delayed animation's before phase.
    assert(win.getComputedStyle(cards[1]).opacity === '0' && win.getComputedStyle(cards[2]).opacity === '0', '错峰等待期间元素提前显示');
    passed('真实新闻卡片的延迟阶段保持隐藏，没有先显示再淡入');
    await waitFor(win, () => cards.every(element => element.dataset.motionState === 'complete'), '新闻入场未完成');
    assert(cards.every(element => win.getComputedStyle(element).opacity === '1'), '新闻入场后未完全显示');
    passed('前台恢复后入场完成，最终可见状态正确');

    const machine = doc.querySelector('.machine'), point = doc.querySelector('[data-unit="0"]'), connector = doc.querySelector('.connector');
    assert(machine.dataset.motionState === 'pending', '屏幕外设备的入场状态被提前消耗');
    assert(win.getComputedStyle(point).visibility === 'hidden', '设备未入场时热点已经可见');
    win.scrollTo(0, machine.getBoundingClientRect().top + win.scrollY - 180);
    await waitFor(win, () => machine.dataset.motionState === 'running', '设备未开始入场');
    assert(win.getComputedStyle(point).visibility === 'hidden' && win.getComputedStyle(connector).visibility === 'hidden', '设备位移期间热点或连线提前显示');
    passed('设备入场期间隐藏热点和连线，避免移动中的坐标错位');
    await waitFor(win, () => machine.dataset.motionState === 'complete', '设备入场未完成');
    assert(win.getComputedStyle(point).visibility === 'visible' && win.getComputedStyle(connector).visibility === 'visible', '设备完成后热点或连线未显示');
    const image = machine.getBoundingClientRect(), marker = point.getBoundingClientRect();
    assert(Math.abs(marker.left + marker.width / 2 - (image.left + image.width * (231.5/1173))) < 1, '热点横向坐标错位');
    assert(Math.abs(marker.top + marker.height / 2 - (image.top + image.height * (246.5/635))) < 1, '热点纵向坐标错位');
    passed('设备落定后热点、连线恢复，热点与设备锚点误差小于 1px');
    const heading=doc.querySelector('.products>.section-title');
    assert(heading.hasAttribute('data-motion-state') && !heading.querySelector('[data-motion-state]'),'标题动效仍绑定透明文字或嵌套重复播放');
    assert(win.getComputedStyle(heading,'::after').backgroundImage!=='none','缺少实际PSD标题图层');
    const sourceCard=doc.querySelector('.unit-card');
    const modules=[...doc.querySelectorAll('[data-unit]')];
    modules[1].click();modules[2].click();modules[0].click();
    await waitFor(win,()=>sourceCard.dataset.unitIndex==='0' && sourceCard.getAnimations().length===0,'快速切换未收敛到最后模块');
    assert(modules[0].getAttribute('aria-pressed')==='true' && win.getComputedStyle(sourceCard).opacity==='1','原稿说明卡切回后仍透明');
    passed('实际PSD标题参与入场，模块快速切换后原稿卡片完整恢复');
    doc.querySelector('.next').click();doc.querySelector('.next').click();doc.querySelector('.previous').click();
    const hero=doc.querySelector('.hero'),copy=doc.querySelector('.hero-copy');
    await waitFor(win,()=>hero.dataset.slide==='1' && copy.getAnimations().length===0,'快速轮播留下了旧回调或未完成动画');
    assert(copy.querySelector('h1').textContent.includes('iSynFlo'),'轮播文字与最终选中项不一致');
    doc.querySelector('.previous').click();
    await waitFor(win,()=>hero.dataset.slide==='0' && copy.getAnimations().length===0,'轮播未恢复原稿');
    passed('轮播完成退场与入场，快速点击遵从最后选择并可恢复PSD首帧');
    const values = [...doc.querySelectorAll('.metric-value')];
    const staticValues = values.slice(2).map(element => element.textContent);
    const counting = () => parseInt(values[0].textContent, 10) > 0 && parseInt(values[0].textContent, 10) < 50;
    const final = () => values[0].textContent === '50%+' && values[1].textContent === '30%';
    const reveal = () => win.scrollTo(0, values[0].getBoundingClientRect().top + win.scrollY - 70);
    reveal();
    await waitFor(win, counting, '数字首次进入未递增');
    visibility(true);
    assert(final(), '后台未完成计数');
    visibility(false);
    assert(final(), '返回前台数字被重置');
    const mutations = [];
    const observer = new win.MutationObserver(records => mutations.push(...records));
    values.slice(0, 2).forEach(element => observer.observe(element, { childList: true, characterData: true, subtree: true }));
    win.scrollTo(0, 0);
    await nextFrame(win); await nextFrame(win); await nextFrame(win);
    reveal();
    for (let i = 0; i < 5; i++) await nextFrame(win);
    assert(final() && mutations.length === 0 && observer.takeRecords().length === 0, '离开后再次进入不应重播数字');
    observer.disconnect();
    assert(values.slice(2).every((element, index) => element.textContent === staticValues[index]), '其他业务指标被改写');
    passed('数字首次进入递增，离开重入和前后台切换均不重播，其他指标保持原值');
    const html = await (await fetch('../index.html')).text();
    const bootstrap = `<base href="${location.origin}/"><style>header,.hero{display:none!important}</style>`;
    await new Promise(resolve => { frame.onload = resolve; frame.srcdoc = html.replace('<head>', '<head>' + bootstrap); });
    const initialWin = frame.contentWindow, initialDoc = frame.contentDocument;
    await waitFor(initialWin, () => initialDoc.querySelector('.metric-value'), '初始可见页未初始化');
    const initialValue = initialDoc.querySelector('.metric-value');
    await waitFor(initialWin, () => parseInt(initialValue.textContent, 10) > 0 && parseInt(initialValue.textContent, 10) < 50, '初始可见未计数');
    await waitFor(initialWin, () => initialValue.textContent === '50%+', '初始可见未完成');
    passed('初始化时已经可见的数字也播放递增');
    for(const width of [1280,390]){
      frame.style.width=`${width}px`;frame.removeAttribute('srcdoc');
      await new Promise(resolve=>{frame.onload=resolve;frame.src='../index.html';});
      const view=frame.contentWindow,page=frame.contentDocument,em=page.querySelector('.hero-copy h1 em');
      assert(view.getComputedStyle(em).color!=='rgba(0, 0, 0, 0)','响应式标题强调字仍透明');
      assert(view.getComputedStyle(page.querySelector('.hero-copy h1'),'::before').display==='none','响应式标题仍展示带照片底色的切图');
      assert(page.querySelector('.hero-scene')?.contains(page.querySelector('.hero-copy')),'首屏照片与文字没有共同的缩放容器');
      assert(page.documentElement.scrollWidth<=width,'响应式首屏横向溢出');
    }
    passed('1280/390px首屏使用完整原生文字，共同缩放容器避免照片切图接缝');
    status.textContent = `全部通过：${results.children.length} 项真实页面浏览器回归`;
  } catch (error) { status.textContent = '检查失败：' + error.message; }
  finally { button.disabled = false; }
});
