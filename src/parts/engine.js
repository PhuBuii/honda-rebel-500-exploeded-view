import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { box, castShape, ghost, glowMaterial, group, lathe, markEffect, mesh, rod, tube } from './shapes.js';

// Toạ độ đo từ ảnh báo chí Honda (nhìn từ bên phải), quy đổi theo chiều dài cơ sở 1,49 m.
// Động cơ 471 cc, 2 xi-lanh song song, DOHC, làm mát bằng nước nên thân máy không có lá tản nhiệt.
const CRANK = [0.078, 0.354];
const CLUTCH = [-0.051, 0.398];
const REAR_COVER = [-0.194, 0.35];
const CYLINDER_TILT = -0.34; // khoảng 19° về phía trước

const CRANK_THROW = 0.0334; // hành trình piston 66,8 mm
const ROD_LENGTH = 0.135;
const BORE_Z = 0.056; // tâm xi-lanh, cách nhau như máy 2 xi-lanh song song
const FIRING_WINDOW = 0.7;
const CLUTCH_MARK_ANGLE = -0.08;
const CRANK_SPEED = 8; // rad/s: quay chậm cho dễ nhìn, xe thật nhanh hơn nhiều lần

// Khoảng cách từ tâm trục khuỷu đến chốt piston tại góc quay theta.
export function pistonTravel(theta) {
  const offset = CRANK_THROW * Math.sin(theta);
  return CRANK_THROW * Math.cos(theta) + Math.sqrt(ROD_LENGTH ** 2 - offset ** 2);
}

// Độ sáng lần nổ của một xi-lanh. Trục khuỷu 180°: xi-lanh 0 nổ tại 0°, xi-lanh 1 tại 180°,
// rồi nghỉ 540° vì mỗi xi-lanh chỉ nổ một lần sau mỗi hai vòng quay.
export function firingGlow(theta, cylinder) {
  const cycle = Math.PI * 4;
  const fireAt = cylinder === 0 ? 0 : Math.PI;
  const since = (((theta - fireAt) % cycle) + cycle) % cycle;
  const wrapped = since > cycle - 1e-9 ? 0 : since;
  return wrapped < FIRING_WINDOW ? 1 - wrapped / FIRING_WINDOW : 0;
}

const CASE_OUTLINE = [
  [-0.215, 0.33],
  [-0.2, 0.42],
  [-0.12, 0.49],
  [-0.03, 0.505],
  [0.05, 0.45],
  [0.17, 0.405],
  [0.178, 0.33],
  [0.14, 0.25],
  [0.05, 0.205],
  [-0.1, 0.205],
  [-0.2, 0.26],
];

// Bậc đúc nổi trên vách máy, ôm lấy nắp côn và nắp trước.
const CASE_STEP_OUTLINE = [
  [-0.16, 0.35],
  [-0.15, 0.43],
  [-0.09, 0.478],
  [-0.02, 0.485],
  [0.05, 0.43],
  [0.15, 0.39],
  [0.155, 0.33],
  [0.12, 0.27],
  [0.04, 0.235],
  [-0.09, 0.235],
  [-0.15, 0.28],
];

// Biên dạng hai thuỳ của đầu xi-lanh, theo trục xi-lanh tính từ tâm trục khuỷu.
const HEAD_OUTLINE = [
  [-0.085, 0.2],
  [-0.112, 0.255],
  [-0.1, 0.312],
  [-0.05, 0.338],
  [0, 0.326],
  [0.05, 0.338],
  [0.1, 0.312],
  [0.112, 0.255],
  [0.085, 0.2],
];

// Nắp tròn dạng vòm trên vách máy; profile là các cặp [bán kính, khoảng nhô ra] từ mép vào tâm.
function dome([x, y], side, profile, material) {
  const m = lathe(
    profile.map(([r, height]) => [r, side * height]),
    material,
    { segments: 56 },
  );
  m.position.set(x, y, 0);
  return m;
}

function boltRing([x, y], radius, count, z, material, startAngle = 0.3) {
  const bolts = group();
  for (let i = 0; i < count; i += 1) {
    const angle = startAngle + (i / count) * Math.PI * 2;
    const bx = x + radius * Math.cos(angle);
    const by = y + radius * Math.sin(angle);
    bolts.add(rod([bx, by, z], [bx, by, z + Math.sign(z) * 0.006], 0.0065, 0.0055, material, 6));
  }
  return bolts;
}

function crankcase(m) {
  const parts = group();
  parts.add(castShape(CASE_OUTLINE, 0.098, m.engine, { bevel: 0.012 }));
  parts.add(castShape(CASE_STEP_OUTLINE, 0.106, m.cover, { bevel: 0.005 }));

  // Bên phải: nắp côn lớn có đĩa giữa chia đôi, nắp tròn nhỏ phía trước và phía sau.
  parts.add(
    dome(
      CLUTCH,
      1,
      [
        [0.098, 0.104],
        [0.095, 0.113],
        [0.08, 0.123],
        [0.05, 0.13],
        [0.037, 0.131],
        [0.036, 0.137],
        [0.031, 0.139],
        [0, 0.139],
      ],
      m.cover,
    ),
  );
  const clutchMark = box([0.062, 0.0028, 0.003], [CLUTCH[0], CLUTCH[1], 0.14], m.rubber, { radius: 0.001, rotZ: CLUTCH_MARK_ANGLE });
  parts.add(clutchMark);
  parts.userData.clutchMark = clutchMark;
  parts.add(boltRing(CLUTCH, 0.104, 8, 0.106, m.bolt));

  parts.add(
    dome(
      CRANK,
      1,
      [
        [0.058, 0.104],
        [0.056, 0.116],
        [0.046, 0.122],
        [0.032, 0.12],
        [0.025, 0.11],
        [0, 0.108],
      ],
      m.cover,
    ),
  );
  parts.add(boltRing(CRANK, 0.066, 4, 0.106, m.bolt, 0.8));

  parts.add(
    dome(
      REAR_COVER,
      1,
      [
        [0.026, 0.092],
        [0.026, 0.1],
        [0.022, 0.102],
        [0, 0.102],
      ],
      m.cover,
    ),
  );

  // Bên trái: nắp máy phát ở đầu trục khuỷu và nắp nhông (ước lượng, ảnh tham chiếu chỉ rõ bên phải).
  parts.add(
    dome(
      CRANK,
      -1,
      [
        [0.078, 0.104],
        [0.076, 0.116],
        [0.06, 0.126],
        [0.03, 0.13],
        [0, 0.13],
      ],
      m.cover,
    ),
  );
  parts.add(boltRing(CRANK, 0.084, 7, -0.106, m.bolt));
  parts.add(
    dome(
      [-0.08, 0.33],
      -1,
      [
        [0.06, 0.104],
        [0.057, 0.114],
        [0.04, 0.12],
        [0, 0.121],
      ],
      m.cover,
    ),
  );

  // Các-te dầu.
  parts.add(box([0.17, 0.035, 0.15], [-0.03, 0.2, 0], m.engine, { radius: 0.014 }));
  return parts;
}

function cylinderBlock(m) {
  const block = group();
  block.position.set(CRANK[0], CRANK[1], 0);
  block.rotation.z = CYLINDER_TILT;

  block.add(box([0.135, 0.125, 0.212], [0, 0.145, 0], m.engine, { radius: 0.01 }));

  for (const s of [1, -1]) {
    const z = s * 0.109;
    // Gân đúc nổi dọc theo xi-lanh và hai gờ ngang, như trên thân máy thật.
    for (const x of [-0.052, 0.052]) {
      block.add(box([0.014, 0.125, 0.012], [x, 0.145, z], m.cover, { radius: 0.003 }));
    }
    for (const y of [0.112, 0.178]) {
      block.add(box([0.116, 0.012, 0.01], [0, y, z], m.cover, { radius: 0.003 }));
    }
    block.add(box([0.012, 0.048, 0.01], [0, 0.145, z], m.cover, { radius: 0.003 }));
  }

  // Gờ nối giữa thân máy và đầu xi-lanh.
  block.add(box([0.158, 0.012, 0.222], [0, 0.205, 0], m.cover, { radius: 0.004 }));

  block.add(castShape(HEAD_OUTLINE, 0.112, m.engine, { bevel: 0.009 }));

  for (const s of [1, -1]) {
    // Nắp đầu trục cam bạc: hai điểm sáng dễ nhận ra nhất của động cơ này.
    for (const x of [-0.048, 0.048]) {
      block.add(rod([x, 0.275, s * 0.119], [x, 0.275, s * 0.124], 0.027, 0.024, m.cover, 32));
      block.add(rod([x, 0.275, s * 0.124], [x, 0.275, s * 0.128], 0.016, 0.0145, m.bolt, 32));
    }
    block.add(box([0.034, 0.022, 0.005], [0, 0.3, s * 0.122], m.cover, { radius: 0.002 }));
  }

  // Nắp giàn cò phía trên, bắt bốn bu-lông.
  block.add(box([0.12, 0.024, 0.15], [0, 0.334, 0], m.cover, { radius: 0.009 }));
  for (const x of [-0.042, 0.042]) {
    for (const z of [-0.055, 0.055]) {
      block.add(rod([x, 0.346, z], [x, 0.352, z], 0.006, 0.005, m.bolt, 6));
    }
  }
  return block;
}

function intake(m) {
  const parts = group();
  // Cổ hút và họng ga sau đầu xi-lanh, nối vào hộp lọc gió dưới yên.
  parts.add(rod([0.075, 0.62, 0], [-0.03, 0.612, 0], 0.024, 0.024, m.engine, 20));
  parts.add(rod([0.012, 0.615, 0.024], [0.012, 0.615, 0.058], 0.016, 0.014, m.bolt, 16));
  parts.add(rod([-0.03, 0.612, 0], [-0.13, 0.605, 0], 0.024, 0.03, m.rubber, 20));
  // Dây ga bạc chạy xuống vách máy.
  parts.add(
    tube(
      [
        [0.018, 0.59, 0.07],
        [0.0, 0.55, 0.098],
        [-0.03, 0.52, 0.112],
        [-0.075, 0.5, 0.115],
      ],
      0.0028,
      m.metal,
      { segments: 20, radial: 6 },
    ),
  );
  return parts;
}

function radiator(m) {
  const parts = group();
  const unit = group();
  unit.position.set(0.345, 0.55, 0);
  unit.rotation.z = -0.23;
  unit.add(box([0.042, 0.215, 0.21], [0, 0, 0], m.engine, { radius: 0.006 }));
  // Tấm ốp hai bên cao và hẹp nhìn thấy rõ từ cạnh xe.
  for (const s of [1, -1]) {
    unit.add(box([0.074, 0.222, 0.004], [-0.004, 0, s * 0.107], m.cover, { radius: 0.002 }));
    for (const y of [-0.085, 0.085]) {
      unit.add(rod([-0.012, y, s * 0.109], [-0.012, y, s * 0.114], 0.007, 0.006, m.bolt, 6));
    }
  }
  // Lưới két nước ở mặt trước.
  for (let i = 0; i < 16; i += 1) {
    unit.add(box([0.004, 0.0042, 0.186], [0.023, -0.092 + i * 0.0123, 0], m.rubber, { radius: 0.001 }));
  }
  parts.add(unit);

  // Ống nước trên và dưới.
  parts.add(
    tube(
      [
        [0.32, 0.625, 0.04],
        [0.285, 0.625, 0.05],
        [0.245, 0.58, 0.04],
      ],
      0.011,
      m.rubber,
      { segments: 16, radial: 8 },
    ),
  );
  parts.add(
    tube(
      [
        [0.31, 0.47, -0.04],
        [0.27, 0.41, -0.05],
        [0.19, 0.39, -0.04],
      ],
      0.011,
      m.rubber,
      { segments: 16, radial: 8 },
    ),
  );
  return parts;
}

// Phần chuyển động bên trong, chỉ hiện khi lớp vỏ trong suốt. Toạ độ theo trục xi-lanh.
function internals() {
  const m = createMaterials();
  const root = group();
  root.position.set(CRANK[0], CRANK[1], 0);
  root.rotation.z = CYLINDER_TILT;

  const crank = group();
  crank.add(rod([0, 0, -0.1], [0, 0, 0.1], 0.016, 0.016, m.metal, 16));
  root.add(crank);

  const cylinders = [1, -1].map((side) => {
    const z = side * BORE_Z;
    // Hai cổ biên lệch nhau 180° trên trục khuỷu.
    crank.add(rod([0, side * CRANK_THROW, z - 0.012], [0, side * CRANK_THROW, z + 0.012], 0.013, 0.013, m.metal, 14));
    for (const web of [-0.018, 0.018]) {
      crank.add(box([0.05, 0.075, 0.01], [0, side * CRANK_THROW * 0.45, z + web], m.accent, { radius: 0.006 }));
    }

    const piston = group();
    piston.add(rod([0, -0.022, z], [0, 0.03, z], 0.0325, 0.0325, m.metal, 28));
    for (const y of [0.012, 0.02]) {
      piston.add(rod([0, y, z], [0, y + 0.003, z], 0.0332, 0.0332, m.engine, 28));
    }
    root.add(piston);

    const connectingRod = box([0.016, ROD_LENGTH, 0.012], [0, 0, z], m.bolt, { radius: 0.004 });
    root.add(connectingRod);

    const flash = mesh(new THREE.SphereGeometry(0.034, 16, 12), glowMaterial('#ffb24a', 0));
    flash.position.set(0, 0.205, z);
    flash.scale.y = 0.45;
    root.add(flash);

    return { piston, connectingRod, flash, z };
  });

  // Hai trục cam quay bằng nửa tốc độ trục khuỷu, mỗi xi-lanh hai vấu cam.
  const cams = [-0.048, 0.048].map((x) => {
    const cam = group();
    cam.position.set(x, 0.275, 0);
    cam.add(rod([0, 0, -0.105], [0, 0, 0.105], 0.008, 0.008, m.metal, 12));
    for (const z of [-0.07, -0.042, 0.042, 0.07]) {
      cam.add(box([0.016, 0.03, 0.01], [0, 0.007, z], m.accent, { radius: 0.004 }));
    }
    root.add(cam);
    return cam;
  });

  markEffect(root);

  function update(theta) {
    crank.rotation.z = -theta;
    cylinders.forEach(({ piston, connectingRod, flash, z }, index) => {
      const angle = theta + index * Math.PI;
      const travel = pistonTravel(angle);
      piston.position.y = travel;
      const pinX = CRANK_THROW * Math.sin(angle);
      const pinY = CRANK_THROW * Math.cos(angle);
      connectingRod.position.set(pinX / 2, (pinY + travel) / 2, z);
      connectingRod.rotation.z = Math.atan2(pinX, travel - pinY);
      flash.material.opacity = firingGlow(theta, index);
    });
    for (const cam of cams) cam.rotation.z = -theta / 2;
  }

  return { root, update };
}

export function buildEngine() {
  const m = createMaterials();
  const shell = [m.engine, m.cover, m.rubber, m.metal, m.bolt];
  const caseParts = crankcase(m);
  const moving = internals();
  const engine = group(caseParts, cylinderBlock(m), intake(m), radiator(m), moving.root);
  const { clutchMark } = caseParts.userData;
  delete caseParts.userData.clutchMark;

  engine.userData.action = (time, k, dt, { reveal = true } = {}) => {
    ghost(shell, reveal ? k : 0, 0.16);
    moving.root.visible = reveal && k > 0;
    if (k === 0) {
      clutchMark.rotation.z = CLUTCH_MARK_ANGLE;
      return;
    }
    const theta = time * CRANK_SPEED;
    moving.update(theta);
    clutchMark.rotation.z = CLUTCH_MARK_ANGLE - theta * 0.5;
  };
  return engine;
}
