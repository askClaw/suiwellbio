import { createAnimationController, settleMotionStates, entranceMotion, motionEase } from './motion-core.js';
import { createEntranceRegistry } from './entrance-registry.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 960px)');
const motionFallback = () => window.__suiwellMotionBoot?.mode === 'fallback';
const skipMotion = () => preference.matches || document.hidden || motionFallback();
const animations = createAnimationController(skipMotion);
const ease = motionEase;
const motionHooks = new Set();
function addMotionHooks(hooks) { motionHooks.add(hooks); }
const contactLink = '<a class="button" href="contact.html#consultation">联系工艺工程师 →</a>';
const details = {
  video: '<h2>iSynFlo™ 在线配液系统</h2><img src="assets/hero.webp" width="1920" height="838" alt="在线配液系统"><p>设计文件中未附带视频素材。您可以查看首页的设备介绍，或联系团队获取产品演示视频。</p>' + contactLink,
  product: '<h2>iSynFlo™ 在线配液系统</h2><img src="assets/machine.png" width="1173" height="635" alt="iSynFlo 在线配液设备"><p>高度自动化，在封闭管路中实时动态混合稀释，直接产出符合工艺要求的药液。</p><p>融合自动化控制、流体工程及洁净工艺技术，支持缓冲液自动切换与全程闭环控制，可集成或独立运行。</p>' + contactLink,
  about: '<h2>关于穗维卓生物</h2><img src="assets/factory.webp" alt="生产园区"><p>上海穗维卓生物科技有限公司深耕在线配液系统研发、设计与制造，为客户商业化生产提供定制化方案与全流程支持。</p><p>秉持“专业、创新、品质、服务”理念，以专业工艺，持续为客户创造价值。</p>' + contactLink,
  news: '<h2>新闻资讯</h2><p>首页展示了设计稿中的三则新闻摘要。点击新闻卡片可查看对应摘要，完整稿件尚待补充。</p>',
  language: '<h2>English Version</h2><p>The English version is being prepared. Please contact our team for product information and consultation in English.</p>' + contactLink
};
// Entrance animations own opacity / translate / scale. CSS hover owns transform.
const entryObserver = new IntersectionObserver(entries => {
  if (document.hidden) return;
  startEntrances(entries.filter(entry => entry.isIntersecting).map(entry => entry.target));
}, { threshold: .04, rootMargin: '0px 0px -3% 0px' });
const entranceRegistry = createEntranceRegistry({
  unobserve: element => entryObserver.unobserve(element),
  cancel: element => animations.cancel(element),
  reveal: element => {
    element.classList.remove('motion-pending');
    element.dataset.motionState = 'complete';
  },
  reset: element => {
    element.classList.remove('motion-pending');
    delete element.dataset.motion;
    delete element.dataset.motionState;
  }
});
const entrances = entranceRegistry.active;
function disposeEntrances(root) { entranceRegistry.disposeWithin(root); }
function startEntrances(elements) {
  const groups = new Map();
  elements.forEach(element => {
    const state = entrances.get(element);
    if (!state || state.status !== 'pending') return;
    const group = state.group || element;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(element);
  });
  groups.forEach((elements, group) => {
    // Reset the stagger on each visual row when several rows enter together.
    const rows = new Map();
    const grid = getComputedStyle(group).display === 'grid';
    elements.forEach(element => {
      const top = grid ? Math.round(element.getBoundingClientRect().top) : 0;
      const row = [...rows.keys()].find(value => Math.abs(value - top) < 8) ?? top;
      const index = rows.get(row) || 0;
      rows.set(row, index + 1);
      enter(element, stateDelay(element) + Math.min(index * 110, 330));
    });
  });
}
function stateDelay(element) { return entrances.get(element)?.delay || 0; }
function completeEntrance(element) {
  entranceRegistry.complete(element);
}
function enter(element, delay = 0, immediately = false) {
  const state = entrances.get(element);
  if (!state || state.status !== 'pending' || document.hidden) return;
  state.status = 'running';
  element.dataset.motionState = 'running';
  element.classList.remove('motion-pending');
  entryObserver.unobserve(element);
  if (immediately) { completeEntrance(element); return; }
  const motion = entranceMotion(state.direction, mobile.matches);
  animations.run(element, element, motion.frames,
    { duration: motion.duration, delay, easing: motion.easing, fill: 'backwards' }, () => completeEntrance(element));
}
function registerEntrances(selector, direction = 'up', groupSelector, { animateVisible = false, delay = 0 } = {}) {
  $$(selector).forEach((element, index) => {
    if (entranceRegistry.has(element)) return;
    const rect = element.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < innerHeight;
    const state = { direction, delay, group: groupSelector ? element.closest(groupSelector) : null, status: 'pending' };
    entranceRegistry.add(element, state);
    element.dataset.motion = direction;
    const playVisible = animateVisible || (scrollY === 0 && (groupSelector === '.hero-content' || document.body.dataset.page !== 'home'));
    if (visible && playVisible && !skipMotion() && element.animate) {
      enter(element, delay + Math.min(index * 110, 330)); return;
    }
    if (preference.matches || motionFallback() || (visible && !document.hidden) || !element.animate) { completeEntrance(element); return; }
    element.classList.add('motion-pending');
    element.dataset.motionState = 'pending';
    entryObserver.observe(element);
  });
}
// Animate the element that paints the PSD artwork, rather than its transparent
// semantic children. This also avoids moving a child inside an entering card.
registerEntrances('.section-title', 'heading');
registerEntrances('.machine', 'scale');
registerEntrances('.unit-card', 'left');
registerEntrances('.application-grid > button', 'up', '.application-grid');
registerEntrances('.about-card');
registerEntrances('.news-grid article', 'up', '.news-grid');
registerEntrances('.solution .container > div');
registerEntrances('.solution .gold');
registerEntrances('.footer-grid > *', 'up', '.footer-grid');
document.addEventListener('focusin', event => {
  for (const [element, state] of entrances) {
    if (element.contains(event.target) && state.status !== 'complete') {
      animations.cancel(element);
      completeEntrance(element);
    }
  }
});

// Only percentages count. Business expressions always retain their real value.
const counters = new Map();
const counterCanvas = document.createElement('canvas').getContext('2d');
let counterFontLoaded=false;
const counterFontReady=($('.metric-grid')?document.fonts.load('700 36px MetricCounter','0123456789%+'):Promise.resolve()).catch(()=>{}).then(()=>{
  counterFontLoaded=true;
  counters.forEach(state=>{state.geometry=null;renderCounter(state,state.current);});
});
function renderCounter(state,value) {
  if(state.current===value&&state.geometry)return;
  state.current=value;
  if(!state.svg){state.visual.textContent=value;return;}
  if(!state.geometry){
    const style=getComputedStyle(state.element);
    const { width, height } = state.element.getBoundingClientRect();
    state.geometry={size:parseFloat(style.fontSize),width,height,color:style.color,desktop:matchMedia('(min-width:1280px)').matches};
  }
  const {size,width,height,color,desktop}=state.geometry;
  counterCanvas.font=`700 ${size}px MetricCounter`;
  const metrics=counterCanvas.measureText(value),finalMetrics=counterCanvas.measureText(state.final);
  const baseline=Math.round(finalMetrics.actualBoundingBoxAscent+(desktop?0:(height-finalMetrics.actualBoundingBoxAscent-finalMetrics.actualBoundingBoxDescent)/2));
  state.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  state.text.setAttribute('x',Math.round(width/2+(metrics.actualBoundingBoxLeft-metrics.actualBoundingBoxRight)/2));
  state.text.setAttribute('y',baseline);
  state.text.setAttribute('fill',desktop?'#ebc653':color);
  state.text.style.fontSize=`${size}px`;
  state.text.textContent=value;
}
const counterObserver = new IntersectionObserver(entries => {
  if (document.hidden) return;
  entries.filter(entry => entry.isIntersecting && entry.intersectionRatio >= .15)
    .forEach(entry => startCounter(entry.target));
}, { threshold: .15 });
function startCounter(element) {
  const state = counters.get(element);
  if (!state || state.status !== 'pending' || document.hidden) return;
  if(preference.matches || motionFallback()){finishCounter(state);return;}
  if(!counterFontLoaded){
    if(!state.waitingFont){state.waitingFont=true;counterFontReady.then(()=>{state.waitingFont=false;startCounter(element);});}
    return;
  }
  state.status = 'running';
  element.dataset.counterState = 'running';
  counterObserver.unobserve(element); // Each number plays once per page load.
  if (preference.matches) { finishCounter(state); return; }
  renderCounter(state,'0'+state.suffix);
  const started = performance.now();
  function tick(now) {
    if (state.status !== 'running') return;
    const progress = Math.min((now - started) / 1600, 1);
    renderCounter(state,Math.round(state.target * (1 - (1 - progress) ** 3))+state.suffix);
    if (progress < 1) state.frame = requestAnimationFrame(tick);
    else finishCounter(state);
  }
  state.frame = requestAnimationFrame(tick);
}
function finishCounter(state) {
  cancelAnimationFrame(state.frame);
  counterObserver.unobserve(state.element);
  renderCounter(state,state.final);
  state.status = 'complete';
  state.element.dataset.counterState = 'complete';
}
$$('.metric-grid strong').forEach((element, index) => {
  const final = element.textContent;
  element.setAttribute('aria-label', final);
  const visual = document.createElement('span');
  visual.className = 'metric-value';
  visual.setAttribute('aria-hidden', 'true');
  visual.textContent = final;
  const measure = visual.cloneNode(true);
  measure.className = 'metric-measure';
  element.replaceChildren(measure, visual);
  if (index < 2) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const text=document.createElementNS(svg.namespaceURI,'text');
    svg.classList.add('counter-svg');svg.setAttribute('aria-hidden','true');svg.append(text);visual.replaceChildren(svg);
    element.dataset.counterRenderer='svg';
    const state = { element, visual, svg, text, final, current:final, target: index === 0 ? 50 : 30, suffix: index === 0 ? '%+' : '%', frame: 0, status: 'complete' };
    counters.set(element, state);
    element.dataset.counterState=preference.matches||motionFallback()?'complete':'pending';
    if (!preference.matches && !motionFallback()) {
      state.status = 'pending';
    }
    renderCounter(state,state.status==='pending'?'0'+state.suffix:final);
    counterObserver.observe(element);
  }
});
const counterSizeObserver=new ResizeObserver(entries=>entries.forEach(({target})=>{
  const state=counters.get(target);if(state){state.geometry=null;renderCounter(state,state.current);}
}));
counters.forEach(state=>counterSizeObserver.observe(state.element));
registerEntrances('.metric-grid > div', 'fade', '.metric-grid');

// A dialog remains modal until its exit finishes. Reopening cancels stale cleanup.
const dialog = $('#detail-dialog');
let dialogState = 'closed';
let dialogTrigger = null;
function panelFrame(element) {
  const { opacity, translate } = getComputedStyle(element);
  return { opacity, translate };
}
function showDialog(content, trigger = document.activeElement) {
  const initial = dialog.open ? panelFrame(dialog) : { opacity: 0, translate: '0 6px' };
  dialogTrigger = trigger;
  $('.dialog-body').innerHTML = content;
  $('.dialog-body h2').id = 'dialog-title';
  document.body.classList.add('dialog-open');
  dialogState = 'opening';
  dialog.dataset.state = dialogState;
  if (!dialog.open) dialog.showModal();
  animations.run('dialog', dialog, [initial, { opacity: 1, translate: '0 0' }], { duration: 240, easing: ease, fill: 'both' }, () => {
    dialogState = 'open'; dialog.dataset.state = dialogState;
  });
}
function closeDialog() {
  if (dialogState === 'closed' || dialogState === 'closing') return;
  const initial = panelFrame(dialog);
  dialogState = 'closing'; dialog.dataset.state = dialogState;
  animations.run('dialog', dialog, [initial, { opacity: 0, translate: '0 4px' }], { duration: 180, easing: 'ease-in', fill: 'both' }, () => {
    dialogState = 'closed'; dialog.dataset.state = dialogState;
    dialog.close();
    document.body.classList.remove('dialog-open');
    const trigger = dialogTrigger;
    if (trigger instanceof HTMLElement && trigger.isConnected && trigger.getClientRects().length && !trigger.matches(':disabled')) trigger.focus({ preventScroll: true });
    else $('.brand').focus({ preventScroll: true });
  });
}
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
$('.dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return; // A queued close event must not close a newly opened dialog.
  animations.cancel('dialog');
  dialogState = 'closed'; dialog.dataset.state = dialogState;
  document.body.classList.remove('dialog-open');
});
$$('[data-dialog]').forEach(button => button.addEventListener('click', () => showDialog(details[button.dataset.dialog], button)));
$$('[data-application]').forEach(button => button.addEventListener('click', () => showDialog(`<h2>${button.dataset.application} · 在线配液应用</h2><p>iSynFlo™ 在线配液系统面向制药领域的缓冲液配制需求，提供动态混合、在线检测与闭环控制。具体配置需根据您的工艺要求评估。</p>${contactLink}`, button)));
// Mobile menu has separate visual and interactive states.
const nav = $('#main-nav');
const menuButton = $('.menu-toggle');
let menuState = 'closed';
function closeMenu(reason = 'outside') {
  if (!mobile.matches || menuState === 'closed' || menuState === 'closing') return;
  const initial = panelFrame(nav);
  menuState = 'closing'; nav.dataset.state = menuState;
  nav.inert = true;
  menuButton.setAttribute('aria-expanded', 'false');
  animations.run('menu', nav, [initial, { opacity: 0, translate: '0 -6px' }], { duration: 150, easing: 'ease-in', fill: 'both' }, () => {
    nav.classList.remove('open');
    menuState = 'closed'; nav.dataset.state = menuState;
    if (reason === 'escape') menuButton.focus({ preventScroll: true });
  });
}
function openMenu() {
  const initial = menuState === 'closing' ? panelFrame(nav) : { opacity: 0, translate: '0 -6px' };
  setSearch(false);
  nav.classList.add('open'); nav.inert = false;
  menuButton.setAttribute('aria-expanded', 'true');
  menuState = 'opening'; nav.dataset.state = menuState;
  animations.run('menu', nav, [initial, { opacity: 1, translate: '0 0' }], { duration: 230, easing: ease, fill: 'both' }, () => { menuState = 'open'; nav.dataset.state = menuState; });
}
function syncMenuBreakpoint() {
  animations.cancel('menu');
  nav.classList.remove('open');
  menuState = 'closed'; nav.dataset.state = menuState;
  menuButton.setAttribute('aria-expanded', 'false');
  nav.inert = mobile.matches;
}
menuButton.addEventListener('click', () => menuState === 'open' || menuState === 'opening' ? closeMenu('toggle') : openMenu());
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  closeMenu('link');
  if (mobile.matches && link.getAttribute('href').startsWith('#')) {
    const destination = $(link.getAttribute('href'));
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  }
}));
document.addEventListener('click', event => {
  if (event.target.closest('header')) return;
  closeMenu();
  setSearch(false);
});
mobile.addEventListener('change', syncMenuBreakpoint);
syncMenuBreakpoint();
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || dialog.open) return;
  closeMenu('escape');
  setSearch(false, true);
});

const searchButton = $('.search-toggle');
const searchPanel = $('.search-panel');
function setSearch(open, restoreFocus = false) {
  if (searchButton.getAttribute('aria-expanded') === String(open)) return;
  const initial = searchPanel.hidden ? { opacity: 0, translate: '0 -6px' } : panelFrame(searchPanel);
  const moveFocus = !open && (restoreFocus || searchPanel.contains(document.activeElement));
  searchButton.setAttribute('aria-expanded', String(open));
  searchPanel.inert = !open;
  if (open) {
    closeMenu();
    searchPanel.hidden = false;
    $('#site-search').focus({ preventScroll: true });
  } else if (moveFocus) {
    searchButton.focus({ preventScroll: true });
  }
  const target = open ? { opacity: 1, translate: '0 0' } : { opacity: 0, translate: '0 -6px' };
  animations.run('search', searchPanel, [initial, target],
    { duration: open ? 220 : 160, easing: open ? ease : 'ease-in', fill: 'both' },
    () => { searchPanel.hidden = !open; });
}
searchButton.addEventListener('click', () => setSearch(searchButton.getAttribute('aria-expanded') === 'false'));
searchPanel.addEventListener('submit', event => {
  event.preventDefault();
  const query = $('#site-search').value.trim().toLowerCase();
  const result = query && $$('main section').find(section => section.textContent.toLowerCase().includes(query));
  $('.search-result').textContent = result ? `已找到“${$('#site-search').value.trim()}”的相关内容。` : '未找到相关内容，请尝试“配液”“应用”或“新闻”。';
  if (result) {
    setSearch(false);
    if (!result.hasAttribute('tabindex')) result.tabIndex = -1;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: skipMotion() ? 'auto' : 'smooth', block: 'start' });
  }
});
function settleMotion({ all = false } = {}) {
  // Running finite effects finish; unseen pending work survives a background visit.
  animations.settle();
  settleMotionStates({ entrances, counters, completeEntrance, finishCounter, all });
  motionHooks.forEach(hooks => hooks.settle?.());
  motionHooks.forEach(hooks => hooks.resume?.());
}
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight - 16;
}
function resumeVisibleMotion() {
  if (document.hidden) return;
  // IntersectionObserver need not notify again if visibility changed without scrolling.
  startEntrances([...entrances].filter(([element, state]) => state.status === 'pending' && isInViewport(element)).map(([element]) => element));
  counters.forEach((state, element) => { if (state.status === 'pending' && isInViewport(element)) startCounter(element); });
  motionHooks.forEach(hooks => hooks.resume?.());
}
preference.addEventListener('change', () => {
  if (preference.matches) settleMotion({ all: true });
  motionHooks.forEach(hooks => hooks.resume?.());
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) settleMotion(); else resumeVisibleMotion();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { settleMotion(); resumeVisibleMotion(); motionHooks.forEach(hooks => hooks.restore?.()); }
});

function updateScrollState() {
  $('header').classList.toggle('is-scrolled', scrollY > 35);
  $('.floating-tools').classList.toggle('show-top', scrollY > 400);
}
let headerFrame = 0;
window.addEventListener('scroll', () => {
  if (!headerFrame) headerFrame = requestAnimationFrame(() => { headerFrame = 0; updateScrollState(); });
}, { passive: true });
updateScrollState();
// Register specific groups before the generic fallback (registration is deduplicated).
for (const group of ['.core-unit-grid','.advantage-grid','.four-cards','.parameter-grid','.certificate-grid','.download-grid','.location-cards','.expertise-list']) {
  registerEntrances(`${group} > [data-entry]`, 'up', group);
}
registerEntrances('.project-timeline > li:nth-child(odd) > article', 'right');
registerEntrances('.project-timeline > li:nth-child(even) > article', 'left');
// Inner-page entrances use leaf groups so text never animates inside a moving card.
registerEntrances('.banner-content > div > *', 'up', '.banner-content > div');
registerEntrances('.banner-content > img', 'scale');
registerEntrances('.stage-ribbon > li', 'fade', '.stage-ribbon');
registerEntrances('.stage-content > div', 'up', '.stage-content');
registerEntrances('.work-flow > li', 'up', '.work-flow');
registerEntrances('.application-strip .eyebrow', 'fade');
registerEntrances('.application-strip li', 'up', '.application-strip ul');
registerEntrances('.faq-item > summary', 'up', '.faq-list');
registerEntrances('.news-tabs', 'fade');
registerEntrances('.contact-visual', 'image');
registerEntrances('.contact-info', 'right', undefined, { delay: 150 });
registerEntrances('.form-heading', 'heading');
registerEntrances('.consultation-form > .form-field, .consultation-form > .form-submit', 'up', '.consultation-form');
registerEntrances('.company-intro > div:first-child', 'left');
registerEntrances('.company-intro .factory-frame,.team-photo,.locations-map', 'image');
registerEntrances('[data-entry]');
export { $, $$, preference, mobile, skipMotion, animations, ease, registerEntrances, disposeEntrances, showDialog, addMotionHooks, updateScrollState };
