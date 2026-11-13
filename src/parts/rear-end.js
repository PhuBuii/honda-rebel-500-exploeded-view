import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { ghost, glowMaterial, group, markEffect, mesh, rod, tube } from './shapes.js';

const SHOCK_Z = 0.135;
const SHOCK_BOTTOM = new THREE.Vector3(-0.62, 0.345, 0);
const SHOCK_TOP = new THREE.Vector3(-0.548, 0.595, 0);
const SHOCK_TRAVEL = 0.05;
const UP = new THREE.Vector3(0, 1, 0);

class Helix extends THREE.Curve {
  constructor(from, to, radius, turns) {
    super();
    this.from = from;
    this.axis = to.clone().sub(from);
    this.radius = radius;
    this.turns = turns;
    this.u = new THREE.Vector3(0, 0, 1);
    this.v = this.axis.clone().cross(this.u).normalize();
  }

  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * this.turns * Math.PI * 2;
    return target
      .copy(this.from)
      .addScaledVector(this.axis, t)
      .addScaledVector(this.u, this.radius * Math.cos(angle))
      .addScaledVector(this.v, this.radius * Math.sin(angle));
  }
}

export function buildShock() {
  const m = createMaterials();
  const shocks = group();
  const axis = SHOCK_TOP.clone().sub(SHOCK_BOTTOM);
  const length = axis.length();
  const orientation = new THREE.Quaternion().setFromUnitVectors(UP, axis.clone().normalize());
  const springTop = 0.82 * length;
  const springLength = 0.58 * length;
  const units = [];

  for (const s of [1, -1]) {
    // Dựng trong hệ toạ độ riêng: trục y chạy dọc giảm xóc từ đáy lên đỉnh.
    const unit = group();
    unit.position.copy(SHOCK_BOTTOM).setZ(s * SHOCK_Z);
    unit.quaternion.copy(orientation);
    const at = (t) => [0, t * length, 0];

    // Giảm xóc đôi đen hoàn toàn, lò xo đen bán bóng như xe thật.
    unit.add(rod(at(0.82), at(1), 0.024, 0.02, m.frame, 18));
    unit.add(rod(at(0.82), at(0.86), 0.038, 0.038, m.engine, 22));

    // Phần dưới trượt lên vào thân trên khi nén.
    const lower = group();
    lower.add(rod(at(0), at(1), 0.011, 0.011, m.metal, 12));
    lower.add(rod(at(0), at(0.3), 0.022, 0.022, m.frame, 18));
    lower.add(rod(at(0.2), at(0.24), 0.038, 0.038, m.engine, 22));
    unit.add(lower);

    const helix = new Helix(new THREE.Vector3(), new THREE.Vector3(0, -springLength, 0), 0.031, 6);
    const spring = mesh(new THREE.TubeGeometry(helix, 96, 0.0058, 6), m.cover);
    spring.position.y = springTop;
    unit.add(spring);

    shocks.add(unit);
    units.push({ lower, spring });
  }

  const setTravel = (travel) => {
    for (const { lower, spring } of units) {
      lower.position.y = travel;
      spring.scale.y = 1 - travel / springLength;
    }
  };
  shocks.userData.drive = { setTravel };
  shocks.userData.action = (time, k) => setTravel(SHOCK_TRAVEL * k * (0.5 - 0.5 * Math.cos(time * 3.1)));
  return shocks;
}

const header = (z) => [
  [0.24, 0.52, z],
  [0.285, 0.44, z],
  [0.3, 0.34, z],
  [0.27, 0.2, z * 1.05],
  [0.15, 0.135, z * 1.1 + 0.03],
  [-0.04, 0.15, 0.13],
  [-0.27, 0.205, 0.17],
];

const PULSES_PER_HEADER = 5;
const PUFFS = 6;
const TIP = new THREE.Vector3(-0.872, 0.313, 0.206);

export function buildExhaust() {
  const m = createMaterials();
  const exhaust = group();
  exhaust.add(tube(header(0.055), 0.017, m.frame, { segments: 70 }));
  exhaust.add(tube(header(-0.055), 0.017, m.frame, { segments: 70 }));
  // Ống tiêu âm to, dài vượt qua trục bánh sau; đen nhám, đầu ống bạc.
  exhaust.add(rod([-0.27, 0.205, 0.17], [-0.486, 0.29, 0.19], 0.02, 0.052, m.engine, 28));
  exhaust.add(rod([-0.486, 0.29, 0.19], [-0.84, 0.31, 0.205], 0.052, 0.058, m.frame, 32));
  exhaust.add(rod([-0.84, 0.31, 0.205], [-0.865, 0.312, 0.206], 0.058, 0.056, m.metal, 32));
  exhaust.add(rod([-0.865, 0.312, 0.206], [-0.866, 0.3122, 0.206], 0.056, 0.036, m.rubber, 32));

  // Từng nhịp khí nóng chạy từ mỗi cổ xả về ống tiêu âm, nguội dần trên đường đi.
  const effects = markEffect(group());
  const pulseMaterial = glowMaterial('#ff9a3c', 0.9);
  const flows = [0.055, -0.055].map((z, index) => {
    const curve = new THREE.CatmullRomCurve3(
      [...header(z), [-0.486, 0.29, 0.19], [-0.84, 0.31, 0.205]].map((p) => new THREE.Vector3(...p)),
    );
    const pulses = [];
    for (let i = 0; i < PULSES_PER_HEADER; i += 1) {
      const pulse = mesh(new THREE.SphereGeometry(0.02, 12, 8), pulseMaterial);
      effects.add(pulse);
      pulses.push(pulse);
    }
    // Hai xi-lanh nổ lệch nhau nên hai dòng khí không chạy cùng nhịp.
    return { curve, pulses, phase: index * 0.27 };
  });

  // Khói ở đầu ống, nở ra và tan dần.
  const puffs = [];
  for (let i = 0; i < PUFFS; i += 1) {
    const puff = mesh(
      new THREE.SphereGeometry(0.036, 14, 10),
      new THREE.MeshBasicMaterial({ color: '#c4c8cc', transparent: true, opacity: 0, depthWrite: false }),
    );
    effects.add(puff);
    puffs.push(puff);
  }
  markEffect(effects);
  exhaust.add(effects);

  const shell = [m.frame, m.engine, m.rubber];
  exhaust.userData.action = (time, k, dt, { reveal = true } = {}) => {
    ghost(shell, reveal ? k : 0, 0.28);
    effects.visible = k > 0;
    if (k === 0) return;
    for (const { curve, pulses, phase } of flows) {
      pulses.forEach((pulse, i) => {
        // Khi không làm trong suốt thì khí nằm khuất trong ống, chỉ còn khói ở đầu ống.
        pulse.visible = reveal;
        const u = (time * 0.42 + phase + i / PULSES_PER_HEADER) % 1;
        curve.getPoint(u, pulse.position);
        pulse.scale.setScalar(k * (1.1 - 0.75 * u));
      });
    }
    puffs.forEach((puff, i) => {
      const age = (time * 0.55 + i / PUFFS) % 1;
      puff.position.copy(TIP);
      puff.position.x -= age * 0.42;
      puff.position.y += age * age * 0.14;
      puff.scale.setScalar(0.5 + age * 2.6);
      puff.material.opacity = 0.3 * (1 - age) * k;
    });
  };
  return exhaust;
}
