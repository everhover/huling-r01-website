/* A locally rendered product study. No external runtime or model download. */
const canvas = document.querySelector('#ring');
const context = canvas.getContext('2d');
const chapters = [...document.querySelectorAll('[data-scene]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 767px)');
let width = 0;
let height = 0;
let pendingFrame = false;
let chapterTops = [];
let recordingState = 0;
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
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  chapterTops = chapters.map(section => section.getBoundingClientRect().top + scrollY);
  queueFrame();
}

function rotate(point, angleX, angleY, angleZ) {
  const [x, y, z] = point;
  const y1 = y * Math.cos(angleX) - z * Math.sin(angleX);
  const z1 = y * Math.sin(angleX) + z * Math.cos(angleX);
  const x2 = x * Math.cos(angleY) + z1 * Math.sin(angleY);
  const z2 = -x * Math.sin(angleY) + z1 * Math.cos(angleY);
  return [x2 * Math.cos(angleZ) - y1 * Math.sin(angleZ), x2 * Math.sin(angleZ) + y1 * Math.cos(angleZ), z2];
}

// Rounded rectangular cross-section gives the ring a broad external band.
const segments = 96;
const crossSegments = 24;
const vertices = [];
const normals = [];
for (let u = 0; u < segments; u++) {
  const angle = u / segments * Math.PI * 2;
  for (let v = 0; v < crossSegments; v++) {
    const cross = v / crossSegments * Math.PI * 2;
    const radial = Math.cos(cross);
    const axial = Math.sin(cross);
    const radius = 1 + Math.sign(radial) * Math.pow(Math.abs(radial), 0.35) * 0.17;
    const depth = Math.sign(axial) * Math.pow(Math.abs(axial), 0.35) * 0.34;
    vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius, depth]);
    normals.push([Math.cos(angle) * radial, Math.sin(angle) * radial, axial]);
  }
}

const desktopViews = [
  { x: .74, y: .49, size: .28, rx: .36, ry: -.55, rz: -.5, opacity: 1 },
  { x: .5, y: .52, size: .37, rx: 1.1, ry: .4, rz: .5, opacity: .12 },
  { x: .79, y: .5, size: .43, rx: .3, ry: -.95, rz: -.6, opacity: 1 },
  { x: .24, y: .52, size: .28, rx: -.4, ry: .5, rz: -.8, opacity: 1 },
  { x: .76, y: .53, size: .26, rx: 1, ry: -.3, rz: .4, opacity: 1 }
];
const mobileViews = desktopViews.map(view => ({
  ...view,
  x: .5,
  y: .5,
  size: view.opacity < .2 ? .36 : .32
}));

function render() {
  pendingFrame = false;
  if (!context || !width || !height) return;
  const localScroll = Math.max(0, scrollY);
  let index = 0;
  for (let i = 1; i < chapterTops.length; i++) {
    if (localScroll >= chapterTops[i]) index = i;
  }
  const next = Math.min(index + 1, chapters.length - 1);
  const distance = chapterTops[next] - chapterTops[index];
  const fraction = distance > 0 ? Math.min(1, (localScroll - chapterTops[index]) / distance) : 0;
  const eased = reducedMotion.matches ? 0 : fraction * fraction * (3 - 2 * fraction);
  const views = mobileQuery.matches ? mobileViews : desktopViews;
  const view = {};
  for (const key of Object.keys(views[index])) {
    view[key] = views[index][key] + (views[next][key] - views[index][key]) * eased;
  }
  document.querySelector('#chapter').textContent = String(Math.min(5, index + 1)).padStart(2, '0');
  context.clearRect(0, 0, width, height);
  const scale = Math.min(width, height) * view.size;
  const centerX = width * view.x;
  const centerY = height * view.y;
  const transformed = vertices.map(point => rotate(point, view.rx, view.ry, view.rz));
  const rotatedNormals = normals.map(point => rotate(point, view.rx, view.ry, view.rz));
  const projected = transformed.map(([x, y, z]) => {
    const perspective = 5 / (5 - z);
    return [centerX + x * scale * perspective, centerY + y * scale * perspective];
  });
  const faces = [];
  for (let u = 0; u < segments; u++) {
    for (let v = 0; v < crossSegments; v++) {
      const a = u * crossSegments + v;
      const b = ((u + 1) % segments) * crossSegments + v;
      const c = ((u + 1) % segments) * crossSegments + (v + 1) % crossSegments;
      const d = u * crossSegments + (v + 1) % crossSegments;
      faces.push({ indices: [a, b, c, d], depth: (transformed[a][2] + transformed[c][2]) / 2 });
    }
  }
  faces.sort((a, b) => a.depth - b.depth);
  context.globalAlpha = view.opacity;
  for (const face of faces) {
    const normal = rotatedNormals[face.indices[0]];
    const illumination = Math.max(0, normal[0] * -.35 + normal[1] * -.65 + normal[2] * .67);
    const reflection = Math.pow(Math.max(0, normal[0] * -.25 + normal[1] * -.35 + normal[2] * .9), 22);
    const metal = Math.round(48 + illumination * 130 + reflection * 72);
    const finish = finishes[selectedColor].rgb;
    const channels = finish.map(channel => Math.min(255, Math.round(metal * channel)));
    context.fillStyle = `rgb(${channels.join(',')})`;
    context.strokeStyle = context.fillStyle;
    context.lineWidth = .6;
    context.beginPath();
    face.indices.forEach((vertex, position) => {
      const point = projected[vertex];
      if (position === 0) context.moveTo(...point);
      else context.lineTo(...point);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }
  // The circular physical key follows the same rigid transform as the band.
  const button = rotate([1.18, 0, 0], view.rx, view.ry, view.rz);
  if (button[2] > -.15) {
    const perspective = 5 / (5 - button[2]);
    const bx = centerX + button[0] * scale * perspective;
    const by = centerY + button[1] * scale * perspective;
    context.save();
    context.translate(bx, by);
    context.rotate(view.rz);
    const gradient = context.createLinearGradient(-12, -12, 12, 12);
    gradient.addColorStop(0, '#eeeeef');
    gradient.addColorStop(1, '#737378');
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, 0, scale * .045, scale * .075, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  // The small white indicator shares the band transform and lights during recording.
  const indicator = rotate([1.16, -.19, 0], view.rx, view.ry, view.rz);
  if (indicator[2] > -.15) {
    const perspective = 5 / (5 - indicator[2]);
    const ix = centerX + indicator[0] * scale * perspective;
    const iy = centerY + indicator[1] * scale * perspective;
    context.save();
    context.fillStyle = recordingState === 1 ? '#ffffff' : '#343436';
    context.shadowColor = '#ffffff';
    context.shadowBlur = recordingState === 1 ? 8 : 0;
    context.beginPath();
    context.arc(ix, iy, Math.max(1.6, scale * .012), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  document.querySelector('#hardware-status').classList.toggle('visible', index === 2);
  context.globalAlpha = 1;
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

const record = document.querySelector('#record');
record.addEventListener('click', () => {
  recordingState = (recordingState + 1) % 3;
  const recording = recordingState === 1;
  const organized = recordingState === 2;
  record.setAttribute('aria-pressed', String(recording));
  document.querySelector('#record-label').textContent = [
    '演示双击，开始录音', '再双击，结束并自动整理', '重新体验双击记录'
  ][recordingState];
  document.querySelector('.capture-label').textContent = [
    '交互演示 / 试着交代两件事', '录音中 / 已轻震 · 白色指示灯亮起', '录音结束 / 待办与日程已自动整理'
  ][recordingState];
  document.querySelector('#capture-text').textContent = organized
    ? '两件事，已各归其位。无需二次整理。'
    : '“记得发出设计稿，明天下午三点和设计师开会。”';
  document.querySelector('#organized-results').hidden = !organized;
  document.querySelector('#hardware-status').classList.toggle('recording', recording);
  document.querySelector('#hardware-label').textContent = recording
    ? '白灯亮起 · 录音中' : '双击戒指，开始记录';
  document.querySelector('#flow-start').classList.toggle('active', recording);
  document.querySelector('#flow-speak').classList.toggle('active', recording);
  document.querySelector('#flow-organize').classList.toggle('active', organized);
  if (recording && !reducedMotion.matches) {
    canvas.classList.remove('haptic');
    void canvas.offsetWidth;
    canvas.classList.add('haptic');
  }
  queueFrame();
  resize();
});
canvas.addEventListener('animationend', () => canvas.classList.remove('haptic'));

const colorButtons = [...document.querySelectorAll('[data-color]')];
colorButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedColor = button.dataset.color;
    colorButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    document.querySelector('#color-caption').textContent = `当前颜色 · ${finishes[selectedColor].name} / 色彩为交互示意`;
    queueFrame();
  });
});
