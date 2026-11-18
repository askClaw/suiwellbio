import { connectorPoints, createPointTween, pathFromPoints } from './motion-core.js';

export function initHome(context) {
const { $, $$, skipMotion, animations, ease, registerEntrances, addMotionHooks, updateScrollState } = context;
if (!$('.hero-copy') || !$('.machine-stage')) return;
const units = [
  ['实时检测与分析单元', '在线 pH 传感器、电导率传感器', '实时监测药液的关键质量属性，为控制提供数据支撑'],
  ['自动化控制单元', '自动化控制系统、操作界面', '实现缓冲液自动切换与全程闭环控制'],
  ['动态混合单元', '封闭管路、在线混合模块', '实时动态混合稀释，产出符合工艺要求的药液'],
  ['流体输送单元', '流体输送与流量检测模块', '稳定输送工艺流体，支持连续化生产'],
  ['高精度计量单元', '质量流量计、体积流量计与高精度计量泵', '精确测量和输送各股流体，确保物料配比精准。']
];
const slides = [
  ['专注在线配液，<br>赋能药企<em>高效合规</em>生产', '为制药与医美领域提供专业在线配液系统解决方案'],
  ['iSynFlo™ 在线配液系统<br>让生产<em>高效、稳定</em>运行', '高度自动化 · 实时动态混合 · 全程闭环控制'],
  ['深耕制药与医美，<br>提供<em>专业工艺</em>支持', '从研发、设计到制造，为商业化生产提供全流程支持']
];

let requestedSlide = 0;
const hero = $('.hero');
const heroCopy = $('.hero-copy');
const slideButtons = $$('.slide-dots button');
const heroTitle = heroCopy.querySelector('h1');
const heroDescription = heroCopy.querySelector('p');

function setCopy(container, [title, description]) {
  container.querySelector('h1').innerHTML = title;
  container.querySelector('p').textContent = description;
}

function measureHero() {
  const copy = measurementCopy(heroCopy);
  const title = copy.querySelector('h1');
  const description = copy.querySelector('p');
  title.style.minHeight = '';
  description.style.minHeight = '';
  let titleHeight = 0;
  let descriptionHeight = 0;
  slides.forEach(content => {
    setCopy(copy, content);
    titleHeight = Math.max(titleHeight, title.getBoundingClientRect().height);
    descriptionHeight = Math.max(descriptionHeight, description.getBoundingClientRect().height);
  });
  copy.remove();
  heroTitle.style.minHeight = `${Math.ceil(titleHeight)}px`;
  heroDescription.style.minHeight = `${Math.ceil(descriptionHeight)}px`;
}
function setSlide(index) {
  const next = (index + slides.length) % slides.length;
  if (next === requestedSlide) return;
  requestedSlide = next;
  [...heroCopy.children].forEach(element => animations.finish(element));
  fadeSwap('hero-copy', heroCopy, () => {
    hero.dataset.slide = String(next);
    setCopy(heroCopy, slides[next]);
    slideButtons.forEach((button, index) => {
      button.classList.toggle('selected', index === next);
      if (index === next) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    });
  });
}
$('.previous').addEventListener('click', () => setSlide(requestedSlide - 1));
$('.next').addEventListener('click', () => setSlide(requestedSlide + 1));
slideButtons.forEach((button, index) => button.addEventListener('click', () => setSlide(index)));
measureHero();
registerEntrances('.hero-copy h1', 'fade', '.hero-copy', { animateVisible: true });
registerEntrances('.hero-copy p', 'fade', '.hero-copy', { animateVisible: true, delay: 150 });
registerEntrances('.hero-content > .button', 'fade', '.hero-content', { delay: 300 });

// Product geometry is measured only on selection / resize, never during tween frames.
let requestedUnit = 0;
let visibleUnit = 0;
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
function measurementCopy(element) {
  const copy = element.cloneNode(true);
  copy.classList.add('measure-copy');
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  copy.style.width = `${element.getBoundingClientRect().width}px`;
  element.after(copy);
  return copy;
}
function fadeSwap(key, element, swap) {
  const { opacity } = getComputedStyle(element);
  animations.run(key, element, [{ opacity }, { opacity: 0 }],
    { duration: 140, easing: 'ease-in', fill: 'both' }, () => {
      swap();
      animations.run(key, element, [{ opacity: 0 }, { opacity: 1 }],
        { duration: 360, easing: ease, fill: 'both' });
    });
}
function measureUnitHeight() {
  const measure = measurementCopy(unitContent);
  let height = 0;
  units.forEach((_, index) => {
    fillUnit(measure, index);
    height = Math.max(height, measure.getBoundingClientRect().height);
  });
  measure.remove();
  unitContent.style.minHeight = `${Math.ceil(height)}px`;
}
function updateLine(duration = 0) {
  const imageLeft = machine.offsetLeft - (getComputedStyle(machine).transform==='none'?0:machine.offsetWidth/2);
  const positions = [[231.5/1173,246.5/635],[123.5/1173,232.5/635],[765.5/1173,216.5/635],[123.5/1173,440.5/635],[872.5/1173,374.5/635]];
  const points = positions.map(([x, y]) => [imageLeft + machine.offsetWidth * x, machine.offsetTop + machine.offsetHeight * y]);
  const card = { left: unitCard.offsetLeft, top: unitCard.offsetTop, width: unitCard.offsetWidth, height: unitCard.offsetHeight };
  card.right = card.left + card.width; card.bottom = card.top + card.height;
  const path = connectorPoints(card, points[visibleUnit], stage.clientWidth <= 760);
  hotspotButtons.forEach((button, index) => {
    button.style.left = `${points[index][0] - button.offsetWidth / 2}px`;
    button.style.top = `${points[index][1] - button.offsetHeight / 2}px`;
  });
  line.move(path, skipMotion() ? 0 : duration);
}
function selectUnit(button) {
  const next = Number(button.dataset.unit);
  if (next === requestedUnit) return;
  requestedUnit = next;
  animations.finish(unitCard);
  fadeSwap('unit-content', unitContent, () => {
    visibleUnit = next;
    unitCard.dataset.unitIndex = String(visibleUnit);
    fillUnit(unitContent, visibleUnit);
    hotspotButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    updateLine(360);
  });
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
