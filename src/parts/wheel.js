import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { extrude, group, lathe, ringShape, rod } from './shapes.js';

export const AXLE_HEIGHT = 0.32;
export const FRONT_AXLE_X = 0.745;
export const REAR_AXLE_X = -0.745;

const OUTER_RADIUS = AXLE_HEIGHT;
const TREAD_BLOCKS = 40;
export const WHEEL_SPEED = 3.2; // rad/s

// Lốp to bản có gai chữ V: khoét mặt lốp theo góc quanh trục và khoảng lệch khỏi đường tâm.
function tire(width, material) {
  const sidewall = 0.055;
  const center = OUTER_RADIUS - sidewall;
  const profile = [];
  for (let i = 0; i <= 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2;
    profile.push([center + sidewall * Math.cos(angle), (width / 2) * Math.sin(angle)]);
  }
  const m = lathe(profile, material, { segments: 240 });
  const p = m.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const axial = p.getZ(i);
    const r = Math.hypot(x, y);
    if (r < center + sidewall * 0.72) continue;
    const phase = (Math.atan2(y, x) / (Math.PI * 2)) * TREAD_BLOCKS + Math.abs(axial) * 22;
    const inGroove = phase - Math.floor(phase) < 0.3 || Math.abs(axial) < 0.004;
    if (inGroove) {
      const k = (r - 0.006) / r;
      p.setXY(i, x * k, y * k);
    }
  }
  m.geometry.computeVertexNormals();
  return m;
}

function brakeDisc(z, outer, material) {
  const shape = ringShape(outer, outer * 0.62);
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const hole = new THREE.Path();
    const r = outer * 0.82;
    hole.absarc(r * Math.cos(angle), r * Math.sin(angle), 0.005, 0, Math.PI * 2);
    shape.holes.push(hole);
  }
  const disc = extrude(shape, 0.005, material, 40);
  disc.position.z = z;
  return disc;
}

function sprocket(z, material) {
  const teeth = 36;
  const shape = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i += 1) {
    const r = i % 2 ? 0.105 : 0.114;
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.055, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const gear = extrude(shape, 0.006, material);
  gear.position.z = z;
  return gear;
}

export function buildWheel({ x, width, front }) {
  const m = createMaterials();
  const wheel = group();
  wheel.position.set(x, AXLE_HEIGHT, 0);

  wheel.add(tire(width, m.rubber));

  // Vành màu đồng rộng bản, nét nhận diện của bản 2024.
  const rimRadius = 0.204;
  wheel.add(
    lathe(
      [
        [rimRadius + 0.012, -width * 0.42],
        [rimRadius - 0.012, -width * 0.36],
        [rimRadius - 0.018, 0],
        [rimRadius - 0.012, width * 0.36],
        [rimRadius + 0.012, width * 0.42],
      ],
      m.accent,
      { segments: 64 },
    ),
  );

  // Mâm đúc đen: các cặp nan chữ V tỏa từ moay-ơ, tổng cộng 10 nan.
  const spokes = 5;
  for (let i = 0; i < spokes; i += 1) {
    const angle = (i / spokes) * Math.PI * 2;
    for (const spread of [-0.17, 0.17]) {
      const outerAngle = angle + spread;
      wheel.add(
        rod(
          [0.04 * Math.cos(angle), 0.04 * Math.sin(angle), 0],
          [0.192 * Math.cos(outerAngle), 0.192 * Math.sin(outerAngle), 0],
          0.012,
          0.008,
          m.frame,
          10,
        ),
      );
    }
  }
  wheel.add(rod([0, 0, -0.065], [0, 0, 0.065], 0.042, 0.042, m.engine, 28));
  wheel.add(rod([0, 0, -0.075], [0, 0, 0.075], 0.012, 0.012, m.metal, 12));

  if (front) {
    wheel.add(brakeDisc(0.068, 0.15, m.bolt));
  } else {
    wheel.add(brakeDisc(0.068, 0.12, m.bolt));
    wheel.add(sprocket(-0.074, m.engine));
  }

  // Lăn về phía trước: nhìn từ bên phải là quay theo chiều kim đồng hồ.
  wheel.userData.action = (time, k, dt) => {
    wheel.rotation.z -= WHEEL_SPEED * k * dt;
  };
  return wheel;
}
