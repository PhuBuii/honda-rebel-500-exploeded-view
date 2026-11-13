import { createMaterials } from './materials.js';
import { asPickProxy, box, group, pivotAt, plate, rod, tube } from './shapes.js';
import { AXLE_HEIGHT, REAR_AXLE_X } from './wheel.js';

// Toạ độ đo từ ảnh báo chí Honda (nhìn từ bên phải), quy đổi theo chiều dài cơ sở 1,49 m.
const PIVOT = [-0.285, 0.33];
export const SWINGARM_PIVOT = PIVOT;

const SPINE = [
  [0.378, 0.869, 0],
  [0.24, 0.81, 0],
  [0.085, 0.755, 0],
];

const mainTube = (s) => [
  [0.085, 0.755, 0.01 * s],
  [-0.063, 0.608, 0.09 * s],
  [-0.2, 0.48, 0.105 * s],
  [-0.29, 0.415, 0.11 * s],
  [-0.29, 0.29, 0.11 * s],
];

const downTube = (s) => [
  [0.413, 0.8, 0.02 * s],
  [0.34, 0.66, 0.11 * s],
  [0.265, 0.54, 0.135 * s],
  [0.205, 0.25, 0.135 * s],
  [0.1, 0.145, 0.125 * s],
  [-0.14, 0.15, 0.125 * s],
  [-0.29, 0.29, 0.11 * s],
];

const seatRail = (s) => [
  [0.03, 0.71, 0.025 * s],
  [-0.15, 0.645, 0.075 * s],
  [-0.4, 0.585, 0.085 * s],
  [-0.6, 0.615, 0.085 * s],
  [-0.69, 0.655, 0.08 * s],
];

const swingarm = (s) => [
  [...PIVOT, 0.1 * s],
  [-0.5, 0.33, 0.105 * s],
  [REAR_AXLE_X, AXLE_HEIGHT, 0.105 * s],
];

const CHAIN = [
  [REAR_AXLE_X, AXLE_HEIGHT + 0.105, -0.092],
  [-0.4, 0.42, -0.092],
  [-0.12, 0.365, -0.092],
  [-0.09, 0.33, -0.092],
  [-0.12, 0.295, -0.092],
  [-0.4, 0.26, -0.092],
  [REAR_AXLE_X, AXLE_HEIGHT - 0.105, -0.092],
  [REAR_AXLE_X - 0.1, AXLE_HEIGHT, -0.092],
];

const SIDE_PANEL = [
  [-0.374, 0.55],
  [-0.2, 0.61],
  [-0.063, 0.642],
  [-0.15, 0.55],
  [-0.255, 0.477],
];

const NECK_GUSSET = [
  [0.117, 0.735],
  [0.345, 0.715],
  [0.385, 0.85],
  [0.25, 0.8],
];

const PIVOT_PLATE = [
  [-0.31, 0.42],
  [-0.25, 0.43],
  [-0.235, 0.33],
  [-0.26, 0.255],
  [-0.32, 0.27],
];

export function buildFrame() {
  const m = createMaterials();
  const frame = group();
  const swing = pivotAt(...PIVOT);
  frame.add(swing.outer);

  frame.add(rod([0.33, 0.95, 0], [0.388, 0.85, 0], 0.033, 0.033, m.frame));
  frame.add(tube(SPINE, 0.028, m.frame, { segments: 24 }));
  frame.add(asPickProxy(tube(SPINE, 0.07, m.frame, { segments: 8, radial: 6 })));

  // Thanh dưới bình xăng và tấm tăng cứng ở cổ xe.
  frame.add(rod([0.117, 0.735, 0], [0.345, 0.715, 0], 0.016, 0.016, m.frame, 12));
  frame.add(plate(NECK_GUSSET, 0, 0.022, m.paint));

  for (const s of [1, -1]) {
    frame.add(tube(mainTube(s), 0.023, m.frame, { segments: 48 }));
    frame.add(tube(downTube(s), 0.02, m.frame, { segments: 90 }));
    frame.add(tube(seatRail(s), 0.016, m.frame, { segments: 48 }));
    frame.add(rod([-0.4, 0.552, 0.085 * s], [-0.255, 0.45, 0.105 * s], 0.014, 0.014, m.frame, 10));

    // Tấm ốp tam giác dưới yên, nét đặc trưng khi nhìn ngang xe.
    frame.add(plate(SIDE_PANEL, s * 0.098, 0.006, m.paint));
    frame.add(plate(PIVOT_PLATE, s * 0.12, 0.012, m.frame));

    // Càng sau gắn cùng khung cho gọn, bánh sau bung ra khỏi nó.
    swing.inner.add(tube(swingarm(s), 0.021, m.frame));
    frame.add(rod([-0.055, 0.25, 0.14 * s], [-0.055, 0.25, 0.245 * s], 0.012, 0.016, m.rubber, 12));

    frame.add(asPickProxy(tube(mainTube(s), 0.055, m.frame, { segments: 12, radial: 6 })));
    frame.add(asPickProxy(tube(downTube(s), 0.05, m.frame, { segments: 24, radial: 6 })));
    frame.add(asPickProxy(tube(swingarm(s), 0.055, m.frame, { segments: 8, radial: 6 })));
    frame.add(asPickProxy(tube(seatRail(s), 0.05, m.frame, { segments: 8, radial: 6 })));
  }

  frame.add(rod([...PIVOT, -0.13], [...PIVOT, 0.13], 0.022, 0.022, m.engine));
  swing.inner.add(rod([-0.5, 0.33, -0.105], [-0.5, 0.33, 0.105], 0.012, 0.012, m.frame, 10));
  swing.inner.add(tube(CHAIN, 0.007, m.engine, { segments: 120, radial: 6, closed: true }));

  // Hộp điện và hộp lọc gió sau tấm ốp.
  frame.add(box([0.2, 0.12, 0.17], [-0.22, 0.53, 0], m.frame, { radius: 0.02, rotZ: 0.45 }));

  // Khung đứng yên, càng sau lắc quanh trục để bánh sau lên xuống theo mặt đường.
  const setSwing = (angle) => {
    swing.outer.rotation.z = angle;
  };
  frame.userData.drive = { setSwing };
  frame.userData.action = (time, k) => setSwing(0.1 * Math.sin(time * 2.6) * k);
  return frame;
}
