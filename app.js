import { createAnimationController, connectorPoints, createPointTween, pathFromPoints, settleMotionStates } from './motion-core.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 960px)');
const skipMotion = () => preference.matches || document.hidden;
const animations = createAnimationController(skipMotion);
const ease = 'cubic-bezier(.22,1,.36,1)';
const contactLink = '<a class="button" href="mailto:wangjun@suiwellbio.com?subject=在线配液系统咨询">联系工艺工程师 →</a>';
const details = {
  video: '<h2>iSynFlo™ 在线配液系统</h2><img src="assets/hero.webp" alt="在线配液系统"><p>设计文件中未附带视频素材。您可以查看首页的设备介绍，或联系团队获取产品演示视频。</p>' + contactLink,
  product: '<h2>iSynFlo™ 在线配液系统</h2><img src="assets/machine.png" alt="iSynFlo 在线配液设备"><p>高度自动化，在封闭管路中实时动态混合稀释，直接产出符合工艺要求的药液。</p><p>融合自动化控制、流体工程及洁净工艺技术，支持缓冲液自动切换与全程闭环控制，可集成或独立运行。</p>' + contactLink,
  about: '<h2>关于穗维卓生物</h2><img src="assets/factory.webp" alt="生产园区"><p>上海穗维卓生物科技有限公司深耕在线配液系统研发、设计与制造，为客户商业化生产提供定制化方案与全流程支持。</p><p>秉持“专业、创新、品质、服务”理念，以专业工艺，持续为客户创造价值。</p>' + contactLink,
  news: '<h2>新闻资讯</h2><p>首页展示了设计稿中的三则新闻摘要。点击新闻卡片可查看对应摘要，完整稿件尚待补充。</p>',
  language: '<h2>English Version</h2><p>The English version is being prepared. Please contact our team for product information and consultation in English.</p>' + contactLink
};
const units = [
  ['实时检测与分析单元', '在线 pH 传感器、电导率传感器', '实时监测药液的关键质量属性，为控制提供数据支撑'],
  ['自动化控制单元', '自动化控制系统、操作界面', '实现缓冲液自动切换与全程闭环控制'],
  ['动态混合单元', '封闭管路、在线混合模块', '实时动态混合稀释，产出符合工艺要求的药液'],
  ['流体输送单元', '流体输送与流量检测模块', '稳定输送工艺流体，支持连续化生产']
];
const slides = [
  ['专注在线配液，<br>赋能药企<em>高效合规</em>生产', '为制药与医美领域提供专业在线配液系统解决方案'],
  ['iSynFlo™ 在线配液系统<br>让生产<em>高效、稳定</em>运行', '高度自动化 · 实时动态混合 · 全程闭环控制'],
  ['深耕制药与医美，<br>提供<em>专业工艺</em>支持', '从研发、设计到制造，为商业化生产提供全流程支持']
];

// Entrance animations own opacity / translate / scale. CSS hover owns transform.
const entrances = new Map();
const entryObserver = new IntersectionObserver(entries => {
  if (document.hidden) return;
  startEntrances(entries.filter(entry => entry.isIntersecting).map(entry => entry.target));
}, { threshold: .08, rootMargin: '0px 0px -16px 0px' });
function startEntrances(elements) {
  const groups = new Map();
  elements.forEach(element => {
    const state = entrances.get(element);
    if (!state || state.status !== 'pending') return;
    const group = state.group || element;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(element);
  });
  groups.forEach(elements => elements.forEach((element, index) => enter(element, Math.min(index * 70, 140))));
}
function completeEntrance(element) {
  element.classList.remove('motion-pending');
  element.dataset.motionState = 'complete';
  const state = entrances.get(element);
  if (state) state.status = 'complete';
  entryObserver.unobserve(element);
}
function enter(element, delay = 0, immediately = false) {
  const state = entrances.get(element);
  if (!state || state.status !== 'pending' || document.hidden) return;
  state.status = 'running';
  element.dataset.motionState = 'running';
  element.classList.remove('motion-pending');
  entryObserver.unobserve(element);
  const x = !mobile.matches && state.direction === 'left' ? -22 : 0;
  const y = state.direction === 'fade' ? 0 : 16;
  if (immediately) { completeEntrance(element); return; }
  animations.run(element, element, [
    { opacity: 0, translate: `${x}px ${y}px`, scale: state.direction === 'scale' ? '.985' : '1' },
    { opacity: 1, translate: '0px 0px', scale: '1' }
  ], { duration: state.direction === 'scale' ? 620 : 540, delay, easing: ease, fill: 'backwards' }, () => completeEntrance(element));
}
function registerEntrances(selector, direction = 'up', groupSelector) {
  $$(selector).forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < innerHeight;
    const state = { direction, group: groupSelector ? element.closest(groupSelector) : null, status: 'pending' };
    entrances.set(element, state);
    element.dataset.motion = direction;
    if (visible && groupSelector === '.hero-content' && scrollY === 0 && !skipMotion() && element.animate) {
      enter(element, index * 80); return;
    }
    if (preference.matches || (visible && !document.hidden) || !element.animate) { completeEntrance(element); return; }
    element.classList.add('motion-pending');
    element.dataset.motionState = 'pending';
    entryObserver.observe(element);
  });
}
registerEntrances('.section-title > *', 'up', '.section-title');
registerEntrances('.machine', 'scale');
registerEntrances('.unit-card', 'left');
registerEntrances('.application-grid > button', 'up', '.application-grid');
registerEntrances('.about-card');
registerEntrances('.about-features > span', 'fade', '.about-features');
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
const counterObserver = new IntersectionObserver(entries => {
  if (document.hidden) return;
  entries.filter(entry => entry.isIntersecting).forEach(entry => startCounter(entry.target));
}, { threshold: .05 });
function startCounter(element) {
  const state = counters.get(element);
  if (!state || state.status !== 'pending' || document.hidden) return;
  state.status = 'running';
  counterObserver.unobserve(element);
  if (preference.matches) { finishCounter(state); return; }
  const started = performance.now();
  function tick(now) {
    if (state.status !== 'running') return;
    const progress = Math.min((now - started) / 1100, 1);
    state.visual.textContent = Math.round(state.target * (1 - (1 - progress) ** 3)) + state.suffix;
    if (progress < 1) state.frame = requestAnimationFrame(tick);
    else finishCounter(state);
  }
  state.frame = requestAnimationFrame(tick);
}
function finishCounter(state) {
  cancelAnimationFrame(state.frame);
  counterObserver.unobserve(state.element);
  state.visual.textContent = state.final;
  state.status = 'complete';
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
  const rect = element.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < innerHeight;
  if (index < 2) {
    const state = { element, visual, final, target: index === 0 ? 50 : 30, suffix: index === 0 ? '%+' : '%', frame: 0, status: 'complete' };
    counters.set(element, state);
    if (!preference.matches && (document.hidden || (!visible && rect.top >= innerHeight))) {
      visual.textContent = '0' + state.suffix;
      state.status = 'pending';
      counterObserver.observe(element);
    }
  }
});
registerEntrances('.metric-grid > div', 'fade', '.metric-grid');

// A dialog remains modal until its exit finishes. Reopening cancels stale cleanup.
const dialog = $('#detail-dialog');
let dialogState = 'closed';
let dialogTrigger = null;
function showDialog(content, trigger = document.activeElement) {
  animations.cancel('dialog');
  dialogTrigger = trigger;
  $('.dialog-body').innerHTML = content;
  $('.dialog-body h2').id = 'dialog-title';
  document.body.classList.add('dialog-open');
  if (!dialog.open) dialog.showModal();
  dialogState = 'opening';
  dialog.dataset.state = dialogState;
  animations.run('dialog', dialog, [{ opacity: 0, translate: '0 10px', scale: '.985' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 250, easing: ease }, () => {
    dialogState = 'open'; dialog.dataset.state = dialogState;
  });
}
function closeDialog() {
  if (dialogState === 'closed' || dialogState === 'closing') return;
  const style = getComputedStyle(dialog);
  const initial = { opacity: style.opacity, translate: style.translate, scale: style.scale };
  dialogState = 'closing'; dialog.dataset.state = dialogState;
  animations.run('dialog', dialog, [initial, { opacity: 0, translate: '0 6px', scale: '.99' }], { duration: 160, easing: 'ease-in' }, () => {
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
$$('[data-news]').forEach(button => button.addEventListener('click', () => {
  const article = $$('.news-grid article')[Number(button.dataset.news)];
  const image = article.querySelector('img');
  showDialog(`<h2>${article.querySelector('h3').textContent}</h2><p>2026-08-18</p><img src="${image.getAttribute('src')}" alt="${image.alt}"><p>${article.querySelector('p').textContent}</p><p>以上为设计稿提供的新闻摘要，完整正文尚待补充。</p>`, button);
}));

// Mobile menu has separate visual and interactive states.
const nav = $('#main-nav');
const menuButton = $('.menu-toggle');
let menuState = 'closed';
function closeMenu(reason = 'outside') {
  if (!mobile.matches || menuState === 'closed' || menuState === 'closing') return;
  const style = getComputedStyle(nav);
  menuState = 'closing'; nav.dataset.state = menuState;
  nav.inert = true;
  menuButton.setAttribute('aria-expanded', 'false');
  animations.run('menu', nav, [{ opacity: style.opacity, translate: style.translate }, { opacity: 0, translate: '0 -6px' }], { duration: 150, easing: 'ease-in' }, () => {
    nav.classList.remove('open');
    menuState = 'closed'; nav.dataset.state = menuState;
    if (reason === 'escape') menuButton.focus({ preventScroll: true });
  });
}
function openMenu() {
  animations.cancel('menu');
  nav.classList.add('open'); nav.inert = false;
  menuButton.setAttribute('aria-expanded', 'true');
  menuState = 'opening'; nav.dataset.state = menuState;
  animations.run('menu', nav, [{ opacity: 0, translate: '0 -8px' }, { opacity: 1, translate: '0 0' }], { duration: 230, easing: ease }, () => { menuState = 'open'; nav.dataset.state = menuState; });
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
  if (mobile.matches) {
    const destination = $(link.getAttribute('href'));
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  }
}));
document.addEventListener('click', event => { if (!event.target.closest('header')) closeMenu(); });
mobile.addEventListener('change', syncMenuBreakpoint);
syncMenuBreakpoint();
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || dialog.open) return;
  closeMenu('escape');
  if (!$('.search-panel').hidden) {
    $('.search-panel').hidden = true;
    $('.search-toggle').setAttribute('aria-expanded', 'false');
    $('.search-toggle').focus();
  }
});

// Hero text has a stable box; the CTA and controls never fade with it.
let slide = 0;
const heroCopy = $('.hero-copy');
function measureHero() {
  const copy = heroCopy.cloneNode(true);
  copy.classList.add('measure-copy'); copy.setAttribute('aria-hidden', 'true'); copy.inert = true;
  copy.style.width = `${heroCopy.clientWidth}px`;
  copy.style.minHeight = '0';
  heroCopy.parentElement.append(copy);
  let height = 0;
  slides.forEach(([title, description]) => {
    copy.querySelector('h1').innerHTML = title;
    copy.querySelector('p').textContent = description;
    height = Math.max(height, copy.getBoundingClientRect().height);
  });
  copy.remove();
  heroCopy.style.minHeight = `${Math.ceil(height)}px`;
}
function setSlide(index) {
  const next = (index + slides.length) % slides.length;
  if (next === slide) return;
  slide = next;
  animations.cancel('hero-copy');
  heroCopy.querySelector('h1').innerHTML = slides[slide][0];
  heroCopy.querySelector('p').textContent = slides[slide][1];
  $$('.slide-dots button').forEach((button, index) => {
    button.classList.toggle('selected', index === slide);
    if (index === slide) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
  });
  animations.run('hero-copy', heroCopy, [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 320, easing: ease });
}
$('.previous').addEventListener('click', () => setSlide(slide - 1));
$('.next').addEventListener('click', () => setSlide(slide + 1));
$$('.slide-dots button').forEach((button, index) => button.addEventListener('click', () => setSlide(index)));
measureHero();
registerEntrances('.hero-copy', 'up', '.hero-content');
registerEntrances('.hero-content > .button', 'up', '.hero-content');

// Product geometry is measured only on selection / resize, never during tween frames.
let activeUnit = 0;
const stage = $('.machine-stage');
const machine = $('.machine');
const unitCard = $('.unit-card');
const unitContent = $('.unit-content');
const hotspotButtons = $$('[data-unit]');
let productVisible = false;
let layoutFrame = 0;
const line = createPointTween({
  now: () => performance.now(), request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id),
  render: points => $$('.connector path').forEach(path => path.setAttribute('d', pathFromPoints(points)))
});
function fillUnit(container, index) {
  container.querySelector('h3 span').textContent = units[index][0];
  const descriptions = container.querySelectorAll('dd');
  descriptions[0].textContent = units[index][1]; descriptions[1].textContent = units[index][2];
}
function measureUnitHeight() {
  const measure = unitContent.cloneNode(true);
  measure.classList.add('measure-copy'); measure.setAttribute('aria-hidden', 'true'); measure.inert = true;
  measure.style.width = `${unitContent.clientWidth}px`; measure.style.minHeight = '0';
  unitCard.append(measure);
  let height = 0;
  units.forEach((_, index) => { fillUnit(measure, index); height = Math.max(height, measure.getBoundingClientRect().height); });
  measure.remove();
  unitContent.style.minHeight = `${Math.ceil(height)}px`;
}
function updateLine(duration = 0) {
  const imageLeft = machine.offsetLeft - machine.offsetWidth / 2;
  const positions = [[.245, .42], [.15, .40], [.70, .38], [.15, .74]];
  const points = positions.map(([x, y]) => [imageLeft + machine.offsetWidth * x, machine.offsetTop + machine.offsetHeight * y]);
  const card = { left: unitCard.offsetLeft, top: unitCard.offsetTop, width: unitCard.offsetWidth, height: unitCard.offsetHeight };
  card.right = card.left + card.width; card.bottom = card.top + card.height;
  const path = connectorPoints(card, points[activeUnit], stage.clientWidth <= 760);
  hotspotButtons.forEach((button, index) => {
    button.style.left = `${points[index][0] - button.offsetWidth / 2}px`;
    button.style.top = `${points[index][1] - button.offsetHeight / 2}px`;
  });
  line.move(path, skipMotion() ? 0 : duration);
}
function selectUnit(button) {
  const next = Number(button.dataset.unit);
  if (next === activeUnit) return;
  const style = getComputedStyle(unitContent);
  const initial = { opacity: Math.min(Number(style.opacity), .45), translate: style.translate };
  activeUnit = next;
  animations.cancel('unit-content');
  fillUnit(unitContent, next);
  hotspotButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  animations.run('unit-content', unitContent, [initial, { opacity: 1, translate: '0 0' }], { duration: 250, easing: ease });
  updateLine(250);
}
hotspotButtons.forEach(button => {
  button.addEventListener('click', () => selectUnit(button));
  button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') selectUnit(button); });
  button.addEventListener('focus', () => selectUnit(button));
});
function refreshLayout() {
  layoutFrame = 0;
  measureHero(); measureUnitHeight(); updateLine(); updateScrollState();
}
function scheduleLayout() {
  if (!layoutFrame) layoutFrame = requestAnimationFrame(refreshLayout);
}
// Observe widths and the device image, not the card whose min-height we write.
let stageWidth = -1;
new ResizeObserver(entries => {
  const width = stage.clientWidth;
  if (width !== stageWidth || entries.some(entry => entry.target === machine)) {
    stageWidth = width; scheduleLayout();
  }
}).observe(stage);
const imageObserver = new ResizeObserver(scheduleLayout);
imageObserver.observe(machine);
machine.addEventListener('load', scheduleLayout);
window.addEventListener('resize', scheduleLayout, { passive: true });
document.fonts?.ready.then(scheduleLayout);
new IntersectionObserver(entries => {
  productVisible = entries[0].isIntersecting;
  updateFlow();
}, { threshold: .01 }).observe(stage);
function updateFlow() { $('.products').classList.toggle('in-view', productVisible && !skipMotion()); }
measureUnitHeight(); updateLine();

// Header tracking follows the actual sticky header height on each breakpoint.
const navigationLinks = $$('#main-nav a');
let scrollFrame = 0;
function updateScrollState() {
  scrollFrame = 0;
  $('header').classList.toggle('is-scrolled', scrollY > 35);
  $('.floating-tools').classList.toggle('show-top', scrollY > 400);
  const threshold = $('.navigation').getBoundingClientRect().bottom + 30;
  let active = 0, closest = -Infinity;
  navigationLinks.forEach((link, index) => {
    if (!index) return;
    const top = $(link.getAttribute('href')).getBoundingClientRect().top;
    if (top <= threshold && top > closest) { active = index; closest = top; }
  });
  if (scrollY + innerHeight >= document.documentElement.scrollHeight - 30) active = navigationLinks.length - 1;
  navigationLinks.forEach((link, index) => {
    link.classList.toggle('active', index === active);
    if (index === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
}
window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollState); }, { passive: true });
updateScrollState();

$('.search-toggle').addEventListener('click', () => {
  const panel = $('.search-panel'); panel.hidden = !panel.hidden;
  $('.search-toggle').setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) $('#site-search').focus();
});
$('.search-panel').addEventListener('submit', event => {
  event.preventDefault();
  const query = $('#site-search').value.trim().toLowerCase();
  const result = query && $$('main section').find(section => section.textContent.toLowerCase().includes(query));
  $('.search-result').textContent = result ? `已找到“${$('#site-search').value.trim()}”的相关内容。` : '未找到相关内容，请尝试“配液”“应用”或“新闻”。';
  if (result) result.scrollIntoView({ behavior: skipMotion() ? 'auto' : 'smooth', block: 'start' });
});
function settleMotion({ all = false } = {}) {
  // Running finite effects finish; unseen pending work survives a background visit.
  animations.settle();
  settleMotionStates({ entrances, counters, completeEntrance, finishCounter, all });
  line.finish();
  updateFlow();
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
  updateFlow();
}
preference.addEventListener('change', () => {
  if (preference.matches) settleMotion({ all: true });
  updateFlow();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) settleMotion(); else resumeVisibleMotion();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { settleMotion(); resumeVisibleMotion(); scheduleLayout(); }
});
