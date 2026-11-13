import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { box, fenderShell, group, pivotAt, rod, tube } from './shapes.js';
import { AXLE_HEIGHT, FRONT_AXLE_X } from './wheel.js';

const RAKE_SLOPE = 0.58; // đo từ ảnh: phuộc ngả nhiều hơn dáng naked
const RAKE = Math.atan(RAKE_SLOPE);
const forkX = (y) => FRONT_AXLE_X - (y - AXLE_HEIGHT) * RAKE_SLOPE;
const LEG_Z = 0.095;
const FORK_TRAVEL = 0.04;
export const FORK_AXIS = new THREE.Vector3(-RAKE_SLOPE, 1, 0).normalize(); // chiều nén của phuộc

// Trục lái đi qua ống cổ khung.
const STEERING_TOP = [0.33, 0.95];
const STEERING_AXIS = new THREE.Vector3(RAKE_SLOPE, -1, 0).normalize();

export function buildFork() {
  const m = createMaterials();
  const fork = group();
  // Phần trượt: chân phuộc cùng mọi thứ gắn với bánh trước.
  const slider = group();
  fork.add(slider);

  for (const s of [1, -1]) {
    const z = s * LEG_Z;
    // Ống trong bạc phía trên, chân phuộc đen dày phía dưới.
    fork.add(rod([forkX(0.66), 0.66, z], [forkX(0.985), 0.985, z], 0.02, 0.02, m.metal, 20));
    slider.add(rod([forkX(AXLE_HEIGHT - 0.03), AXLE_HEIGHT - 0.03, z], [forkX(0.7), 0.7, z], 0.034, 0.03, m.frame, 22));
    slider.add(rod([forkX(0.7), 0.7, z], [forkX(0.715), 0.715, z], 0.031, 0.024, m.engine, 22));
    // Xi-nhan tròn cam gắn thấp trên chân phuộc, phía sau phuộc.
    slider.add(rod([forkX(0.51) - 0.015, 0.51, z], [0.585, 0.52, s * 0.135], 0.006, 0.006, m.frame, 8));
    slider.add(rod([0.56, 0.52, s * 0.135], [0.605, 0.52, s * 0.135], 0.02, 0.023, m.signal, 18));
  }
  slider.add(rod([FRONT_AXLE_X, AXLE_HEIGHT, -LEG_Z - 0.02], [FRONT_AXLE_X, AXLE_HEIGHT, LEG_Z + 0.02], 0.011, 0.011, m.metal, 12));

  for (const y of [0.95, 0.83]) {
    fork.add(box([0.075, 0.034, 0.245], [forkX(y) - 0.025, y, 0], m.frame, { radius: 0.012, rotZ: RAKE }));
  }

  // Cùm phanh gắn trên chân phuộc phải.
  slider.add(box([0.05, 0.095, 0.05], [FRONT_AXLE_X - 0.125, AXLE_HEIGHT + 0.09, 0.08], m.engine, { radius: 0.012, rotZ: RAKE }));

  // Chắn bùn trước ngắn, phần lớn nằm phía sau đỉnh bánh, đi cùng phuộc như trên xe thật.
  slider.add(
    fenderShell(
      {
        center: [FRONT_AXLE_X, AXLE_HEIGHT],
        radius: 0.348,
        halfWidth: 0.088,
        fromAngle: 1.3,
        toAngle: 2.86,
        crown: 0.03,
      },
      m.paint,
    ),
  );

  // Chân phuộc trượt lên theo ống trong khi gặp ổ gà rồi đẩy về, dọc đúng theo trục phuộc.
  const setTravel = (travel) => {
    slider.position.copy(FORK_AXIS).multiplyScalar(travel);
  };
  fork.userData.drive = { setTravel };
  fork.userData.action = (time, k) => {
    const compression = 0.5 - 0.5 * Math.cos(time * 3.1);
    setTravel(FORK_TRAVEL * 2 * compression * k);
  };
  return fork;
}

function barPath(s) {
  return [
    [0.33, 1.03, 0],
    [0.335, 1.04, s * 0.09],
    [0.305, 1.055, s * 0.2],
    [0.245, 1.05, s * 0.3],
    [0.19, 1.04, s * 0.39],
  ];
}

export function buildHandlebar() {
  const m = createMaterials();
  const bar = group();
  const steering = pivotAt(...STEERING_TOP);
  bar.add(steering.outer);
  const parts = steering.inner;

  const left = barPath(-1).reverse();
  const right = barPath(1).slice(1);
  parts.add(tube([...left, ...right], 0.0125, m.frame, { segments: 120 }));

  parts.add(rod([0.355, 0.975, 0.03], [0.33, 1.035, 0.03], 0.016, 0.016, m.frame, 14));
  parts.add(rod([0.355, 0.975, -0.03], [0.33, 1.035, -0.03], 0.016, 0.016, m.frame, 14));
  parts.add(box([0.05, 0.022, 0.1], [0.33, 1.042, 0], m.engine, { radius: 0.008 }));

  // Đồng hồ tròn màn LCD nằm ngay trên ghi đông, nhìn về phía người lái.
  parts.add(rod([0.385, 1.075, 0], [0.365, 1.06, 0], 0.052, 0.056, m.paint, 32));
  parts.add(rod([0.365, 1.06, 0], [0.362, 1.058, 0], 0.046, 0.046, m.lcd, 32));
  parts.add(rod([0.37, 1.04, 0], [0.38, 1.065, 0], 0.016, 0.02, m.frame, 12));

  for (const s of [1, -1]) {
    parts.add(rod([0.225, 1.046, s * 0.33], [0.185, 1.04, s * 0.4], 0.019, 0.019, m.rubber, 16));
    parts.add(box([0.04, 0.035, 0.035], [0.255, 1.05, s * 0.29], m.engine, { radius: 0.01 }));
    // Tay phanh, tay côn.
    parts.add(tube([[0.27, 1.045, s * 0.28], [0.29, 1.035, s * 0.34], [0.26, 1.03, s * 0.43]], 0.0055, m.metal, { segments: 16, radial: 6 }));
    // Gương tròn thấp, đúng chiều cao thật của xe khoảng 1,18 m.
    parts.add(tube([[0.285, 1.055, s * 0.25], [0.28, 1.11, s * 0.28], [0.272, 1.16, s * 0.3]], 0.0055, m.frame, { segments: 16, radial: 6 }));
    parts.add(rod([0.26, 1.18, s * 0.31], [0.27, 1.18, s * 0.31], 0.04, 0.046, m.paint, 28));
    parts.add(rod([0.27, 1.18, s * 0.31], [0.272, 1.18, s * 0.31], 0.04, 0.039, m.metal, 28));
  }

  // Đánh lái trái phải quanh trục cổ khung; màn hình đồng hồ sáng lên.
  const baseLcd = m.lcd.emissiveIntensity;
  bar.userData.action = (time, k) => {
    steering.outer.quaternion.setFromAxisAngle(STEERING_AXIS, 0.42 * Math.sin(time * 1.5) * k);
    m.lcd.emissiveIntensity = baseLcd + 1.2 * k;
  };
  return bar;
}
