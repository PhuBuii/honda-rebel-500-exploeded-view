// Mô hình tiếng máy Rebel 500, thuần số học để dễ kiểm thử: nhịp nổ, vòng tua và độ to.
// Máy 2 xi-lanh song song, trục khuỷu 180°: xi-lanh 0 nổ ở 0°, xi-lanh 1 nổ ở 180° trong chu kỳ 720°,
// rồi nghỉ 540° mới tới cặp kế tiếp. Đó là nhịp "bụp-bụp … bụp-bụp" đặc trưng của loại máy này.

export const IDLE_RPM = 1300;
export const CRUISE_RPM = 3300;
export const CRANK_RPM = 230; // vòng quay của củ đề khi chưa nổ
export const FLARE_RPM = 1900; // vừa nổ máy thì ga vọt lên rồi hạ về cầm chừng
export const CRANKING_SECONDS = 1.1;

const FIRING_ANGLES = [0, 180];
const CYCLE = 720;
const RISE_PER_SECOND = 1800; // tua lên nhanh hơn tua xuống, như máy thật
const FALL_PER_SECOND = 1400;
const MIN_RPM = 900;
const MAX_RPM = 6000;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (k) => {
  const t = clamp(k, 0, 1);
  return t * t * (3 - 2 * t);
};

export const degreesPerSecond = (rpm) => rpm * 6;

// Các lần nổ nằm trong khoảng góc trục khuỷu (from, to], tính tích luỹ từ lúc khởi động.
export function firingsBetween(from, to) {
  const firings = [];
  for (let cycle = Math.floor(from / CYCLE); cycle * CYCLE <= to; cycle += 1) {
    FIRING_ANGLES.forEach((angle, cylinder) => {
      const at = cycle * CYCLE + angle;
      if (at > from && at <= to) firings.push({ angle: at, cylinder });
    });
  }
  return firings;
}

const idleRpm = (t) => IDLE_RPM + 28 * Math.sin(t * 5.3) + 14 * Math.sin(t * 11.1 + 1);
const cruiseRpm = (t) => CRUISE_RPM + 240 * Math.sin(t * 0.7) + 120 * Math.sin(t * 1.9 + 1);

// ride: 0 là đứng yên, 1 là đang chạy; t là thời gian, để vòng tua dao động nhẹ cho tự nhiên.
export function targetRpm(ride, t) {
  const k = clamp(ride, 0, 1);
  return clamp(idleRpm(t) + (cruiseRpm(t) - idleRpm(t)) * k, MIN_RPM, MAX_RPM);
}

export function approach(current, target, dt) {
  const rate = target > current ? RISE_PER_SECOND : FALL_PER_SECOND;
  const step = rate * dt;
  return current + clamp(target - current, -step, step);
}

// Độ to của tiếng máy, từ 0 đến 1.
export function engineLevel({ ride, exploded, focused, enabled }) {
  if (!enabled) return 0;
  const running = 0.5 + 0.5 * clamp(ride, 0, 1);
  const together = 1 - smoothstep(exploded); // tháo rời thì máy không chạy nữa
  return running * together * (focused ? 0.55 : 1);
}
