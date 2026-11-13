// Mô phỏng đơn giản khi xe chạy: mặt đường đẩy hai bánh lên xuống, thân xe chúi theo để lốp luôn chạm đường.

export const WHEELBASE = 1.49;
export const RIDE_SPEED = 4.1; // m/s: chậm hơn xe thật để nhìn rõ chuyển động

// Độ nhấp nhô của mặt đường tại một thời điểm, luôn dương: bánh chỉ bị đẩy lên so với lúc nghỉ.
const bump = (t) => 0.022 + 0.012 * Math.sin(2.3 * t) + 0.009 * Math.sin(5.1 * t + 1);

// Bánh sau gặp đúng chỗ xóc đó sau khi xe đi hết một chiều dài cơ sở.
export function roadBumps(t) {
  return { front: bump(t), rear: bump(t - WHEELBASE / RIDE_SPEED) };
}

// Hạ và nghiêng thân xe để hai lốp vẫn chạm đường khi bánh trước nhô lên front, bánh sau nhô lên rear.
export function bodyPose(front, rear) {
  return { y: (0 - front - rear) / 2, pitch: Math.atan((rear - front) / WHEELBASE) };
}
