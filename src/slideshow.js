// Bố trí các khung ảnh trên một dải lặp vô tận chạy ngang qua màn hình, không phụ thuộc Three.js.

export const SPACING = 4.0; // khoảng cách giữa hai khung (m), theo cỡ ảnh để các ảnh không dính nhau
export const LANE_SPEED = 1.1; // m/s: dải ở xa nên trôi chậm hơn mặt đường, mỗi ảnh nằm giữa khoảng 3,6 giây
const MIN_SLOTS = 6; // tối thiểu để chỗ nối vòng nằm ngoài màn hình

// Số khung trên dải; luôn là bội của số ảnh để thứ tự ảnh liền mạch khi dải quay vòng.
export function slotCount(photoCount) {
  if (photoCount <= 0) return 0;
  return photoCount * Math.ceil(MIN_SLOTS / photoCount);
}

export function slotPhoto(slot, photoCount) {
  return slot % photoCount;
}

// Vị trí x của khung thứ slot khi dải đã trôi một đoạn offset; luôn nằm trong một vòng [-L/2, L/2).
export function slotX(slot, offset, slots) {
  const length = slots * SPACING;
  const wrapped = (((slot * SPACING - offset + length / 2) % length) + length) % length;
  return wrapped - length / 2;
}

// 1 khi khung nằm giữa màn hình, giảm dần về 0 khi khung kế bên tới giữa.
export function focusAt(x) {
  const k = Math.max(0, 1 - Math.abs(x) / SPACING);
  return k * k * (3 - 2 * k);
}
