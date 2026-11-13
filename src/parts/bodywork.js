import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { box, fenderShell, ghost, glowMaterial, group, lathe, loft, markEffect, mesh, pivotAt, rod, tube } from './shapes.js';
import { REAR_AXLE_X } from './wheel.js';

// Bình xăng hình hạt lạc: thấp và hẹp ở đuôi, thắt nhẹ ở giữa, cao và rộng ở gần cổ xe.
// Các bảng tính theo t = 0 ở đuôi bình, t = 1 ở cổ bình.
const TANK_TOP = [[0, 0.75], [0.3, 0.84], [0.6, 0.945], [0.78, 0.98], [1, 0.93]];
const TANK_BOTTOM = [[0, 0.705], [1, 0.845]];
const TANK_WIDTH = [[0, 0.075], [0.3, 0.085], [0.48, 0.09], [0.75, 0.13], [1, 0.1]];

export function buildTank() {
  const m = createMaterials();
  const tank = group();
  tank.add(loft({ fromX: -0.175, toX: 0.33, top: TANK_TOP, bottom: TANK_BOTTOM, width: TANK_WIDTH }, m.paint));
  // Nắp bình tròn viền bạc đặt ở đỉnh bình, như ảnh chụp từ ghế lái.
  tank.add(rod([0.19, 0.974, 0], [0.19, 0.982, 0], 0.05, 0.047, m.metal, 36));
  tank.add(rod([0.19, 0.982, 0], [0.19, 0.986, 0], 0.032, 0.03, m.engine, 28));

  // Xăng bên trong: khối nhỏ hơn vỏ bình, cắt bằng một mặt phẳng nghiêng qua lại như mặt chất lỏng.
  const surface = new THREE.Plane();
  const fuelMaterial = new THREE.MeshStandardMaterial({
    color: '#c9852a',
    emissive: '#a8631a',
    emissiveIntensity: 0.45,
    roughness: 0.3,
    side: THREE.DoubleSide,
    clippingPlanes: [surface],
  });
  const inset = (table, by) => table.map(([t, v]) => [t, v + by]);
  const fuel = markEffect(
    loft(
      {
        fromX: -0.155,
        toX: 0.31,
        top: inset(TANK_TOP, -0.012),
        bottom: inset(TANK_BOTTOM, 0.012),
        width: TANK_WIDTH.map(([t, v]) => [t, v * 0.88]),
      },
      fuelMaterial,
      40,
      24,
    ),
  );
  tank.add(fuel);

  const shell = [m.paint, m.metal, m.engine];
  const levelPoint = new THREE.Vector3();
  const normal = new THREE.Vector3();
  tank.userData.action = (time, k) => {
    ghost(shell, k, 0.3);
    fuel.visible = k > 0;
    if (k === 0) return;
    tank.updateWorldMatrix(true, false);
    tank.localToWorld(levelPoint.set(0.14, 0.85 + 0.006 * Math.sin(time * 1.5), 0));
    const tilt = 0.2 * Math.sin(time * 2.4);
    surface.setFromNormalAndCoplanarPoint(normal.set(Math.sin(tilt), -Math.cos(tilt), 0), levelPoint);
  };
  return tank;
}

const SEAT_TOP = [[0, 0.735], [0.15, 0.74], [0.5, 0.695], [0.8, 0.682], [1, 0.672]];
const SEAT_BOTTOM = [[0, 0.68], [0.5, 0.635], [1, 0.645]];
const SEAT_WIDTH = [[0, 0.1], [0.25, 0.13], [0.55, 0.11], [0.85, 0.06], [1, 0.05]];

export function buildSeat() {
  const m = createMaterials();
  const seat = group();
  const cushion = pivotAt(-0.385, 0.635);
  cushion.inner.add(loft({ fromX: -0.59, toX: -0.18, top: SEAT_TOP, bottom: SEAT_BOTTOM, width: SEAT_WIDTH }, m.leather, 56, 32));
  seat.add(cushion.outer);

  // Mút yên lún xuống và phồng nhẹ ra hai bên như khi có người ngồi lên, rồi đàn hồi lại.
  seat.userData.action = (time, k) => {
    const press = k * (0.5 - 0.5 * Math.cos(time * 2.4));
    cushion.outer.scale.set(1 + 0.02 * press, 1 - 0.3 * press, 1 + 0.05 * press);
  };
  return seat;
}

const FENDER_CENTER = [REAR_AXLE_X - 0.01, 0.38];
const DROP_COUNT = 12;

export function buildFender() {
  const m = createMaterials();
  const fender = group();
  fender.add(
    fenderShell(
      {
        center: FENDER_CENTER,
        radius: 0.365,
        halfWidth: 0.105,
        fromAngle: 1.0,
        toAngle: 2.6,
        crown: 0.032,
      },
      m.paint,
    ),
  );

  // Cụm đèn hậu tròn nhỏ ở đuôi chắn bùn.
  fender.add(rod([-1.05, 0.61, 0], [-1.09, 0.6, 0], 0.03, 0.034, m.frame, 24));
  fender.add(rod([-1.09, 0.6, 0], [-1.098, 0.598, 0], 0.033, 0.028, m.tailLight, 24));

  // Pát biển số thả xuống dưới đuôi, kèm xi-nhan tròn hai bên.
  fender.add(tube([[-1.04, 0.56, 0], [-1.09, 0.48, 0], [-1.12, 0.4, 0]], 0.012, m.frame, { segments: 16, radial: 8 }));
  fender.add(box([0.014, 0.13, 0.17], [-1.135, 0.37, 0], m.frame, { radius: 0.004, rotZ: 0.2 }));
  fender.add(rod([-1.12, 0.34, 0.02], [-1.13, 0.34, 0.02], 0.016, 0.016, m.tailLight, 16));
  for (const s of [1, -1]) {
    fender.add(rod([-1.03, 0.47, s * 0.09], [-1.03, 0.47, s * 0.16], 0.006, 0.006, m.frame, 8));
    fender.add(rod([-1.0, 0.47, s * 0.16], [-1.06, 0.47, s * 0.16], 0.019, 0.022, m.signal, 16));
    // Hai thanh giữ chắn bùn lên khung phụ.
    fender.add(rod([-0.62, 0.62, s * 0.085], [-0.66, 0.7, s * 0.085], 0.009, 0.009, m.frame, 8));
  }

  // Giọt nước văng từ lốp bay theo vòng cung, đập vào mặt dưới chắn bùn rồi rơi xuống.
  const dropMaterial = new THREE.MeshStandardMaterial({ color: '#9cc4d6', metalness: 0.2, roughness: 0.15 });
  const drops = markEffect(group());
  for (let i = 0; i < DROP_COUNT; i += 1) {
    drops.add(mesh(new THREE.SphereGeometry(0.009, 10, 8), dropMaterial));
  }
  markEffect(drops);
  fender.add(drops);

  const baseTail = m.tailLight.emissiveIntensity;
  const baseSignal = m.signal.emissiveIntensity;
  fender.userData.action = (time, k, dt, { reveal = true } = {}) => {
    ghost([m.paint], reveal ? k : 0, 0.4);
    drops.visible = reveal && k > 0;
    m.tailLight.emissiveIntensity = baseTail + k * 2.5 * (0.5 + 0.5 * Math.sin(time * 5));
    m.signal.emissiveIntensity = baseSignal + k * (Math.sin(time * 6) > 0 ? 2.2 : 0);
    if (k === 0) return;
    drops.children.forEach((drop, i) => {
      const u = (time * 0.6 + i / DROP_COUNT) % 1;
      const hitsAt = 0.8;
      const angle = 2.95 - 1.75 * Math.min(u, hitsAt);
      const fall = Math.max(u - hitsAt, 0);
      drop.position.set(
        FENDER_CENTER[0] + 0.335 * Math.cos(angle),
        FENDER_CENTER[1] + 0.335 * Math.sin(angle) - fall * fall * 16,
        ((i * 37) % 11) * 0.014 - 0.07,
      );
    });
  };
  return fender;
}

export function buildHeadlight() {
  const m = createMaterials();
  const light = group();
  light.position.set(0.487, 0.904, 0);
  light.add(
    lathe(
      [
        [0.014, -0.07],
        [0.05, -0.062],
        [0.07, -0.032],
        [0.08, 0.005],
        [0.08, 0.03],
      ],
      m.paint,
      { axis: 'x', segments: 48 },
    ),
  );
  light.add(
    lathe(
      [
        [0.08, 0.028],
        [0.084, 0.032],
        [0.084, 0.04],
        [0.074, 0.044],
      ],
      m.metal,
      { axis: 'x', segments: 48 },
    ),
  );
  light.add(
    lathe(
      [
        [0.074, 0.038],
        [0.056, 0.052],
        [0.03, 0.06],
        [0, 0.063],
      ],
      m.lens,
      { axis: 'x', segments: 48 },
    ),
  );
  // Các vòng chóa đèn và bóng đèn ở giữa, để mặt đèn không phẳng lì khi xem gần.
  for (const [radius, x] of [[0.062, 0.048], [0.047, 0.054], [0.032, 0.059]]) {
    const ring = mesh(new THREE.TorusGeometry(radius, 0.0012, 6, 48), m.metal);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    light.add(ring);
  }
  light.add(rod([0.061, 0, 0], [0.067, 0, 0], 0.015, 0.011, m.metal, 20));
  // Pát đèn bắt vào chạc ba phuộc.
  for (const s of [1, -1]) {
    light.add(rod([-0.03, -0.015, s * 0.078], [-0.085, -0.02, s * 0.09], 0.009, 0.009, m.frame, 10));
  }

  // Đèn bật sáng: hai hình nón lồng nhau làm luồng sáng tỏa ra phía trước.
  const beamMaterials = [glowMaterial('#ffd79a', 0), glowMaterial('#ffe8c4', 0)];
  const beam = group();
  [[0.17, 0.5], [0.09, 0.32]].forEach(([radius, length], i) => {
    const geometry = new THREE.ConeGeometry(radius, length, 40, 12, true);
    geometry.rotateZ(Math.PI / 2);
    geometry.translate(0.06 + length / 2, 0, 0);
    // Sáng ở gần đèn, tắt dần về cuối tia: với hòa màu cộng, màu đen là trong suốt.
    const position = geometry.attributes.position;
    const fade = new Float32Array(position.count * 3);
    for (let v = 0; v < position.count; v += 1) {
      const brightness = Math.max(1 - (position.getX(v) - 0.06) / length, 0) ** 2.4;
      fade.fill(brightness, v * 3, v * 3 + 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(fade, 3));
    beamMaterials[i].vertexColors = true;
    beam.add(mesh(geometry, beamMaterials[i]));
  });
  markEffect(beam);
  light.add(beam);

  const baseLens = m.lens.emissiveIntensity;
  light.userData.action = (time, k) => {
    beam.visible = k > 0;
    // Nháy nhẹ lúc mới bật rồi sáng đều.
    const warmUp = time < 1.4 ? 0.75 + 0.25 * Math.sin(time * 22) : 1;
    const level = k * warmUp;
    m.lens.emissiveIntensity = baseLens + 1.8 * level;
    beamMaterials[0].opacity = 0.14 * level;
    beamMaterials[1].opacity = 0.2 * level;
  };
  return light;
}
