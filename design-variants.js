/* A locally rendered product study. No external runtime or model download. */
const canvas = document.querySelector('#ring');
const ringRenderer = createRingRenderer(canvas, { refined: true });
const chapters = [...document.querySelectorAll('[data-scene]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 767px)');
let width = 0;
let height = 0;
let pendingFrame = false;
let chapterTops = [];
let selectedColor = 'silver';
const finishes = {
  silver: { name: '雾银', rgb: [1, 1.004, 1.012] },
  black: { name: '影黑', rgb: [.42, .43, .45] },
  gold: { name: '杏金', rgb: [1, .81, .61] }
};

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ringRenderer.resize();
  chapterTops = chapters.map(section => section.getBoundingClientRect().top + scrollY);
  queueFrame();
}

const desktopViews = [
  { x: .74, y: .49, size: .28, rx: .36, ry: -.55, rz: -.5, opacity: 1 },
  { x: .5, y: .52, size: .37, rx: 1.1, ry: .4, rz: .5, opacity: .12 },
  { x: .74, y: .5, size: .32, rx: -.4, ry: -1.2, rz: 1.95, opacity: 1 },
  { x: .24, y: .52, size: .28, rx: -.4, ry: -1.0, rz: 1.95, opacity: 1 },
  { x: .76, y: .53, size: .26, rx: 1, ry: -.3, rz: .4, opacity: 1 },
  { x: .74, y: .5, size: .28, rx: .36, ry: -.55, rz: -.5, opacity: 1 }
];
const mobileViews = desktopViews.map(view => ({
  ...view,
  x: .5,
  y: .5,
  size: view.opacity < .2 ? .36 : .32
}));

function render() {
  pendingFrame = false;
  if (!ringRenderer.available || !width || !height) return;
  const localScroll = Math.max(0, scrollY);
  let index = 0;
  for (let i = 1; i < chapterTops.length; i++) {
    if (localScroll >= chapterTops[i] - 1) index = i;
  }
  const next = Math.min(index + 1, chapters.length - 1);
  const distance = chapterTops[next] - chapterTops[index];
  const fraction = distance > 0 ? Math.max(0, Math.min(1, (localScroll - chapterTops[index]) / distance)) : 0;
  const eased = reducedMotion.matches ? 0 : fraction * fraction * (3 - 2 * fraction);
  const views = mobileQuery.matches ? mobileViews : desktopViews;
  const view = {};
  for (const key of Object.keys(views[index])) {
    view[key] = views[index][key] + (views[next][key] - views[index][key]) * eased;
  }
  document.querySelector('#chapter').textContent = String(Math.min(chapters.length, index + 1)).padStart(2, '0');
  // On short phones the product follows the health copy instead of covering it.
  let mobileOffset = 0;
  if (mobileQuery.matches && (index === 3 || index === 4)) {
    const copyBottom = chapters[index].querySelector('.copy').getBoundingClientRect().bottom;
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const canvasTop = stage.bottom - 45 - height;
    mobileOffset = Math.max(0, copyBottom + 12 - canvasTop);
  }
  canvas.style.transform = mobileOffset ? `translateY(${mobileOffset}px)` : '';

  ringRenderer.draw(view,width,height,index === 2,selectedColor);
  canvas.dataset.finish = selectedColor;
  document.documentElement.dataset.chapter = String(index);
  document.documentElement.style.setProperty('--plane-shift', `${Math.max(0,Math.min(1,(view.x-.24)/.5))*132.558}%`);
}

function queueFrame() {
  if (!pendingFrame) {
    pendingFrame = true;
    requestAnimationFrame(render);
  }
}
addEventListener('scroll', queueFrame, { passive: true });
addEventListener('resize', resize);
reducedMotion.addEventListener('change', queueFrame);
resize();
document.fonts.ready.then(resize);

const colorButtons = [...document.querySelectorAll('[data-color]')];
colorButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedColor = button.dataset.color;
    colorButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    document.querySelector('#color-caption').textContent = `已选择 · ${finishes[selectedColor].name} / 本轮模型统一展示银色`;
    queueFrame();
  });
});
