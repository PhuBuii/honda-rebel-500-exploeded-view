import { content } from './content.js';
import { createMotion } from './motion.js';
import { PART_IDS } from './part-ids.js';
import { buildParts, partBounds } from './parts/index.js';
import { createPicker } from './picking.js';
import { createStage } from './scene.js';
import { close, createState, focus, isBrowsing, replay, setLayout, setMemories, setRiding } from './state.js';
import { createUi } from './ui.js';
import { validateContent } from './validate-content.js';
import './style.css';

const DRAG_THRESHOLD = 6;
const NO_WEBGL_MESSAGE = 'Thiết bị này không hiển thị được hình 3D, nên các lời nhắn được đặt ở đây.';
const LOST_WEBGL_MESSAGE = 'Hình 3D vừa dừng hoạt động, nên các lời nhắn được đặt ở đây.';

if (import.meta.env.DEV) {
  const missing = validateContent(content, PART_IDS);
  if (missing.length) console.warn(`Nội dung chưa đủ trong src/content.js:\n${missing.join('\n')}`);
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('stage');

let state = createState(PART_IDS);
let busy = false;

// Trả về false nếu đang bận chuyển cảnh nên việc này bị bỏ qua.
async function run(task) {
  if (busy) return false;
  busy = true;
  try {
    await task();
  } finally {
    busy = false;
  }
  return true;
}

let motion;

const ui = createUi({
  content,
  partIds: PART_IDS,
  reducedMotion,
  on: {
    layout: (layout) => changeLayout(layout),
    riding: (riding) => changeRiding(riding),
    memories: (on) => applyRide((s) => setMemories(s, on)),
    pick: (id) => openPart(id),
    tagAction: () => (state.screen === 'finale' ? replayBike() : closePart()),
  },
});

function changeLayout(layout) {
  return run(async () => {
    const next = setLayout(state, layout);
    if (next === state) return;
    state = next;
    ui.hideIntro();
    ui.setHover(null);
    motion.highlight(null);
    ui.hideShelf();
    await motion.showLayout(layout);
    ui.showShelf(state);
    motion.setRiding(state.riding);
  });
}

// Đổi trạng thái chạy hoặc ảnh kỷ niệm. Ảnh kỷ niệm làm máy quay bay đến khung hình khác nên phải chờ xong.
async function applyRide(change) {
  const ran = await run(async () => {
    state = change(state);
    ui.showModes(state);
    motion.setRiding(state.riding);
    await motion.setMemories(state.memories);
  });
  // Đang chuyển cảnh thì bỏ qua: trả ô tick về đúng trạng thái hiện tại.
  if (!ran) ui.showModes(state);
}

function changeRiding(riding) {
  // Dừng xe thì ảnh kỷ niệm cũng tắt, nên máy quay cũng phải lùi về khung hình cũ.
  if (!riding && state.memories) {
    applyRide((s) => setRiding(s, false));
    return;
  }
  state = setRiding(state, riding);
  ui.showModes(state);
  if (isBrowsing(state)) motion.setRiding(riding);
}

function openPart(id) {
  return run(async () => {
    const next = focus(state, id);
    if (next === state) return;
    state = next;
    ui.setHover(null);
    ui.hideShelf();
    await motion.focus(id);
    ui.showPart(id);
  });
}

function closePart() {
  return run(async () => {
    const next = close(state);
    if (next === state) return;
    state = next;
    ui.hideTag();
    await motion.unfocus();
    if (state.screen === 'finale') {
      await motion.assemble();
      ui.showFinale();
    } else {
      ui.showShelf(state);
      motion.setRiding(state.riding);
    }
  });
}

function replayBike() {
  return run(async () => {
    state = replay(state);
    ui.hideTag();
    await motion.showLayout(state.browse);
    ui.showShelf(state);
    motion.setRiding(state.riding);
  });
}

function start() {
  const stage = createStage(canvas);
  const parts = buildParts();
  for (const part of parts) stage.bike.add(part.object);

  motion = createMotion({ stage, parts, reducedMotion });
  motion.showAssembled();
  ui.showIntro();

  // Ảnh tải xong thì ô "Ảnh kỷ niệm" mới hiện; ảnh lỗi bị bỏ qua.
  stage.memories.load(content.photos ?? []).then((count) => ui.setMemoriesAvailable(count));

  const pick = createPicker({ parts, camera: stage.camera, canvas });

  let down = null;
  canvas.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (moved > DRAG_THRESHOLD) return;
    if (state.screen === 'focused') closePart();
    else if (isBrowsing(state)) {
      const id = pick(event.clientX, event.clientY);
      if (id) openPart(id);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || event.buttons || busy || !isBrowsing(state)) {
      motion.highlight(null);
      ui.setHover(null);
      canvas.style.cursor = '';
      return;
    }
    const id = pick(event.clientX, event.clientY);
    motion.highlight(id);
    ui.setHover(id ? content.parts[id].name : null, event.clientX, event.clientY);
    canvas.style.cursor = id ? 'pointer' : 'grab';
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.screen === 'focused') closePart();
  });

  window.addEventListener('resize', () => {
    stage.resize();
    motion.refit();
  });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    ui.showFallback(LOST_WEBGL_MESSAGE);
  });

  let last = performance.now();
  stage.renderer.setAnimationLoop((now) => {
    // Giữ thời lượng hoạt ảnh đúng cả trên máy yếu; chỉ chặn bước nhảy lớn khi quay lại tab.
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    motion.tick(dt);
    stage.controls.update(dt);
    stage.renderer.render(stage.scene, stage.camera);
  });

  if (import.meta.env.DEV) {
    // Toạ độ màn hình của một bộ phận, phục vụ kiểm thử thủ công việc bấm trên canvas.
    window.__rebel = {
      state: () => state,
      busy: () => busy,
      pick,
      stage,
      motion,
      parts,
      project(id) {
        const part = parts.find((p) => p.id === id);
        const center = partBounds(part.object).getCenter(part.object.position.clone());
        const ndc = center.project(stage.camera);
        return { x: ((ndc.x + 1) / 2) * window.innerWidth, y: ((1 - ndc.y) / 2) * window.innerHeight };
      },
    };
  }
}

function webglAvailable() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

if (webglAvailable()) {
  try {
    start();
  } catch (error) {
    console.error(error);
    ui.showFallback(NO_WEBGL_MESSAGE);
  }
} else {
  ui.showFallback(NO_WEBGL_MESSAGE);
}
