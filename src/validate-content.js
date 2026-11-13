const PLACEHOLDER = '[ĐIỀN';
const SAMPLE_PHOTO = /(^|\/)sample-/;

const isUnwritten = (text) =>
  typeof text !== 'string' || text.trim() === '' || text.trim().startsWith(PLACEHOLDER);

// Trả về danh sách lỗi; mảng rỗng nghĩa là nội dung đã đầy đủ.
export function validateContent(content, partIds) {
  const errors = [];
  if (isUnwritten(content.opening)) errors.push('opening: chưa có lời nhắn');
  if (isUnwritten(content.finale)) errors.push('finale: chưa có lời nhắn');
  for (const id of partIds) {
    const part = content.parts[id];
    if (!part) {
      errors.push(`${id}: thiếu bộ phận`);
      continue;
    }
    if (!part.name || !part.name.trim()) errors.push(`${id}: thiếu tên`);
    if (isUnwritten(part.quote)) errors.push(`${id}: chưa có lời nhắn`);
  }
  for (const [i, photo] of (content.photos ?? []).entries()) {
    const label = `photos[${i}]`;
    if (typeof photo.src !== 'string' || photo.src.trim() === '') errors.push(`${label}: thiếu đường dẫn ảnh`);
    else if (SAMPLE_PHOTO.test(photo.src)) errors.push(`${label}: vẫn là ảnh mẫu`);
    // Chú thích có thể bỏ trống; chỉ báo khi còn chữ giữ chỗ.
    if (typeof photo.caption === 'string' && photo.caption.trim().startsWith(PLACEHOLDER)) {
      errors.push(`${label}: chưa có chú thích`);
    }
  }
  return errors;
}
