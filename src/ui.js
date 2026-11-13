import { config } from './config.js';

const byId = (id) => document.getElementById(id);

function graphemes(text) {
  const normalized = text.normalize('NFC');
  if (typeof Intl.Segmenter !== 'function') return Array.from(normalized);
  return Array.from(new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(normalized), (s) => s.segment);
}

export function createUi({ content, partIds, reducedMotion, on }) {
  const intro = byId('intro');
  const shelf = byId('shelf');
  const chips = byId('chips');
  const progress = byId('progress');
  const hint = byId('hint');
  const tag = byId('tag');
  const tagTitle = byId('tag-title');
  const tagCaption = byId('tag-caption');
  const tagText = byId('tag-text');
  const tagAnnounce = byId('tag-announce');
  const tagAction = byId('tag-action');
  const hover = byId('hover-label');

  byId('intro-text').textContent = content.opening;
  byId('explode').addEventListener('click', () => on.layout('exploded'));
  byId('view-whole').addEventListener('click', () => on.layout('assembled'));
  tagAction.addEventListener('click', () => on.tagAction());

  const modes = byId('modes');
  const layoutButtons = [...modes.querySelectorAll('[data-layout]')];
  const ridingButtons = [...modes.querySelectorAll('[data-riding]')];
  for (const button of layoutButtons) {
    button.addEventListener('click', () => on.layout(button.dataset.layout));
  }
  for (const button of ridingButtons) {
    button.addEventListener('click', () => on.riding(button.dataset.riding === 'true'));
  }
  // Chế độ giảm chuyển động không có xe chạy, nên ẩn lựa chọn này.
  byId('ride-modes').hidden = reducedMotion;

  const memoriesLabel = byId('memories-label');
  const memoriesToggle = byId('memories-toggle');
  memoriesToggle.addEventListener('change', () => on.memories(memoriesToggle.checked));

  const chipFor = new Map();
  for (const id of partIds) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = content.parts[id].name;
    button.addEventListener('click', () => on.pick(id));
    li.append(button);
    chips.append(li);
    chipFor.set(id, button);
  }

  let typing = null;
  let lastFocusedChip = null;

  function stopTyping() {
    if (typing) clearInterval(typing.timer);
    typing = null;
  }

  function finishTyping() {
    if (!typing) return;
    tagText.textContent = typing.text;
    stopTyping();
  }

  function type(text) {
    stopTyping();
    tagAnnounce.textContent = text;
    if (reducedMotion) {
      tagText.textContent = text;
      return;
    }
    const pieces = graphemes(text);
    let shown = 0;
    tagText.textContent = '';
    const timer = setInterval(() => {
      shown += 1;
      tagText.textContent = pieces.slice(0, shown).join('');
      if (shown >= pieces.length) stopTyping();
    }, 1000 / config.motion.typingCharsPerSecond);
    typing = { timer, text };
  }

  tag.addEventListener('click', (event) => {
    if (event.target !== tagAction) finishTyping();
  });

  function openTag({ title, caption, text, actionLabel, finale }) {
    tagTitle.textContent = title;
    tagCaption.textContent = caption ?? '';
    tagCaption.hidden = reducedMotion || !caption;
    tagAction.textContent = actionLabel;
    tag.classList.toggle('is-finale', finale);
    tag.hidden = false;
    tag.classList.remove('swing');
    void tag.offsetWidth; // chạy lại hoạt ảnh lắc mỗi lần mở
    tag.classList.add('swing');
    tag.scrollTop = 0;
    type(text);
    tagAction.focus({ preventScroll: true });
  }

  return {
    showIntro() {
      intro.hidden = false;
    },

    hideIntro() {
      intro.hidden = true;
    },

    showModes(state) {
      for (const button of layoutButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.layout === state.browse));
      }
      for (const button of ridingButtons) {
        button.setAttribute('aria-pressed', String((button.dataset.riding === 'true') === state.riding));
      }
      memoriesToggle.checked = state.memories;
    },

    // Ô "Ảnh kỷ niệm" chỉ hiện khi có ít nhất một ảnh tải được và xe có thể chạy.
    setMemoriesAvailable(count) {
      memoriesLabel.hidden = reducedMotion || count === 0;
    },

    showShelf(state) {
      const { seen } = state;
      this.showModes(state);
      modes.hidden = false;
      for (const [id, chip] of chipFor) {
        const isSeen = seen.has(id);
        chip.classList.toggle('is-seen', isSeen);
        chip.setAttribute('aria-label', `${content.parts[id].name}${isSeen ? ', đã đọc' : ''}`);
      }
      progress.textContent = `Đã đọc ${seen.size}/${partIds.length}`;
      hint.hidden = seen.size > 0;
      shelf.hidden = false;
      lastFocusedChip?.focus({ preventScroll: true });
      lastFocusedChip = null;
    },

    hideShelf() {
      shelf.hidden = true;
      modes.hidden = true;
    },

    showPart(id) {
      lastFocusedChip = chipFor.get(id);
      const part = content.parts[id];
      openTag({ title: part.name, caption: part.action, text: part.quote, actionLabel: 'Đóng', finale: false });
    },

    showFinale() {
      lastFocusedChip = null;
      openTag({ title: 'Lời cuối', text: content.finale, actionLabel: 'Xem lại', finale: true });
    },

    hideTag() {
      stopTyping();
      tag.hidden = true;
    },

    setHover(name, x, y) {
      hover.hidden = !name;
      if (!name) return;
      hover.textContent = name;
      hover.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
    },

    showFallback(message) {
      document.body.classList.add('is-fallback');
      const root = byId('fallback');
      byId('fallback-message').textContent = message;
      byId('fallback-opening').textContent = content.opening;
      const list = byId('fallback-list');
      list.replaceChildren();
      for (const id of partIds) {
        const dt = document.createElement('dt');
        dt.textContent = content.parts[id].name;
        const dd = document.createElement('dd');
        dd.textContent = content.parts[id].quote;
        list.append(dt, dd);
      }
      byId('fallback-finale').textContent = content.finale;
      root.hidden = false;
    },
  };
}
