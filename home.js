import { connectorPoints, createPointTween, pathFromPoints } from './motion-core.js';

export function initHome(context) {
const { $, $$, mobile, skipMotion, animations, ease, registerEntrances, addMotionHooks, updateScrollState } = context;
if (!$('.hero-copy') || !$('.machine-stage')) return;
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
  $('.hero').dataset.slide = String(slide);
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


addMotionHooks({ settle: () => line.finish(), resume: updateFlow, restore: scheduleLayout });
}
