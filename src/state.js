// Luồng màn hình: intro → assembled ⇄ exploded (hai cách xem) ⇄ focused → finale → cách xem cũ.
// Mỗi hàm trả về state mới; thao tác không hợp lệ trả về nguyên state cũ.

export function createState(partIds) {
  return {
    screen: 'intro',
    browse: 'exploded', // cách xem đang dùng, để quay lại sau khi đóng thẻ
    riding: false,
    memories: false, // ảnh kỷ niệm dọc đường; chỉ có khi xe chạy vì ảnh bám theo mặt đường
    focused: null,
    seen: new Set(),
    partIds,
    openedNewPart: false,
  };
}

export function isBrowsing(state) {
  return state.screen === 'assembled' || state.screen === 'exploded';
}

export function setLayout(state, layout) {
  if (state.screen !== 'intro' && !isBrowsing(state)) return state;
  if (state.screen === layout) return state;
  return { ...state, screen: layout, browse: layout };
}

export function explode(state) {
  return setLayout(state, 'exploded');
}

export function setRiding(state, riding) {
  return { ...state, riding, memories: riding && state.memories };
}

export function setMemories(state, memories) {
  return { ...state, memories, riding: memories || state.riding };
}

export function focus(state, id) {
  if (!isBrowsing(state) || !state.partIds.includes(id)) return state;
  return {
    ...state,
    screen: 'focused',
    focused: id,
    seen: new Set(state.seen).add(id),
    openedNewPart: !state.seen.has(id),
  };
}

export function close(state) {
  if (state.screen !== 'focused') return state;
  const isLast = state.openedNewPart && state.seen.size === state.partIds.length;
  return { ...state, screen: isLast ? 'finale' : state.browse, focused: null, openedNewPart: false };
}

export function replay(state) {
  return state.screen === 'finale' ? { ...state, screen: state.browse } : state;
}
