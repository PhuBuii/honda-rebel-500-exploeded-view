import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const PROXY_MATERIAL = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

const vec = (p) => (p.isVector3 ? p : new THREE.Vector3(...p));

export function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function tube(points, radius, material, { segments = 48, radial = 10, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(vec), closed);
  return mesh(new THREE.TubeGeometry(curve, segments, radius, radial, closed), material);
}

// Hình trụ nối hai điểm, bán kính rA ở from và rB ở to.
export function rod(from, to, rA, rB, material, radial = 20) {
  const a = vec(from);
  const b = vec(to);
  const dir = b.clone().sub(a);
  const m = mesh(new THREE.CylinderGeometry(rB, rA, dir.length(), radial), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

export function box([w, h, d], position, material, { radius = 0.01, rotZ = 0 } = {}) {
  const m = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)), material);
  m.position.set(...position);
  m.rotation.z = rotZ;
  return m;
}

// Biến dạng một hình cầu đơn vị: fn nhận (x, y, z) trong [-1, 1] và trả về [X, Y, Z].
export function blob(fn, material, widthSegments = 48, heightSegments = 32) {
  let g = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    p.setXYZ(i, ...fn(p.getX(i), p.getY(i), p.getZ(i)));
  }
  g.computeVertexNormals();
  return mesh(g, material);
}

// Quay một biên dạng [r, a] quanh trục 'z' (mặc định) hoặc 'x'; a nằm dọc theo trục đó.
export function lathe(profile, material, { segments = 48, axis = 'z' } = {}) {
  const points = profile.map(([r, a]) => new THREE.Vector2(r, a));
  const g = new THREE.LatheGeometry(points, segments);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  else g.rotateZ(-Math.PI / 2);
  return mesh(g, material);
}

// Tấm vòm ôm quanh bánh xe, góc tính trong mặt phẳng XY từ trục +X.
export function fenderShell({ center, radius, halfWidth, fromAngle, toAngle, crown }, material) {
  const columns = 40;
  const rows = 10;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= columns; i += 1) {
    const angle = fromAngle + ((toAngle - fromAngle) * i) / columns;
    for (let j = 0; j <= rows; j += 1) {
      const v = (j / rows) * 2 - 1;
      const r = radius - crown * v * v;
      positions.push(center[0] + r * Math.cos(angle), center[1] + r * Math.sin(angle), v * halfWidth);
    }
  }
  const row = rows + 1;
  for (let i = 0; i < columns; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const a = i * row + j;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return mesh(g, material);
}

export function ringShape(outer, inner) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

export function extrude(shape, depth, material, curveSegments = 32) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  return mesh(g, material);
}

// Khối đúc: viền [x, y] được làm trơn thành đường cong kín, đùn đối xứng quanh z = 0, có vát mép.
export function castShape(outline, halfDepth, material, { bevel = 0.01 } = {}) {
  const curve = new THREE.CatmullRomCurve3(outline.map(([x, y]) => new THREE.Vector3(x, y, 0)), true);
  const shape = new THREE.Shape(curve.getPoints(72).map((p) => new THREE.Vector2(p.x, p.y)));
  const depth = 2 * (halfDepth - bevel);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
  });
  g.translate(0, 0, -depth / 2);
  return mesh(g, material);
}

// Tấm mỏng có viền cong kín, đặt tại mặt phẳng z.
export function plate(outline, z, thickness, material) {
  const curve = new THREE.CatmullRomCurve3(outline.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'catmullrom', 0.25);
  const shape = new THREE.Shape(curve.getPoints(48).map((p) => new THREE.Vector2(p.x, p.y)));
  const m = extrude(shape, thickness, material);
  m.position.z = z - thickness / 2;
  return m;
}

// Nội suy trơn (spline Hermite) trong bảng [[t, giá trị], ...] đã sắp theo t tăng dần.
function interpolate(table, t) {
  const last = table.length - 1;
  if (t <= table[0][0]) return table[0][1];
  if (t >= table[last][0]) return table[last][1];
  let i = 0;
  while (t > table[i + 1][0]) i += 1;
  const slope = (j) => {
    const a = table[Math.max(j - 1, 0)];
    const b = table[Math.min(j + 1, last)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  const [t0, v0] = table[i];
  const [t1, v1] = table[i + 1];
  const h = t1 - t0;
  const k = (t - t0) / h;
  return (
    (2 * k ** 3 - 3 * k ** 2 + 1) * v0 +
    (k ** 3 - 2 * k ** 2 + k) * h * slope(i) +
    (-2 * k ** 3 + 3 * k ** 2) * v1 +
    (k ** 3 - k ** 2) * h * slope(i + 1)
  );
}

// Khối bo tròn định hình bằng bảng mép trên, mép dưới và bề rộng dọc theo trục X (t = 0 đến 1).
export function loft({ fromX, toX, top, bottom, width }, material, widthSegments = 64, heightSegments = 40) {
  return blob(
    (x, y, z) => {
      const t = (x + 1) / 2;
      const around = Math.max(Math.hypot(y, z), 1e-4);
      // Đầu mút bo nhanh hơn hình cầu để mép bám đúng bảng thay vì thu nhọn dần.
      const taper = around ** 0.4;
      const hi = interpolate(top, t);
      const lo = interpolate(bottom, t);
      return [
        fromX + (toX - fromX) * t,
        (hi + lo) / 2 + ((hi - lo) / 2) * (y / around) * taper,
        interpolate(width, t) * (z / around) * taper,
      ];
    },
    material,
    widthSegments,
    heightSegments,
  );
}

// Chi tiết chỉ hiện khi bộ phận đang chạy chuyển động: không tính vào khung bao, không bấm chọn được.
export function markEffect(object) {
  object.traverse((o) => {
    o.userData.effect = true;
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  object.visible = false;
  return object;
}

// Làm trong suốt lớp vỏ để nhìn thấy phần chuyển động bên trong; k = 0 trả lại nguyên trạng.
export function ghost(materials, k, opacity) {
  const value = 1 - (1 - opacity) * k;
  for (const mat of materials) {
    const see = value < 1;
    if (mat.transparent !== see) {
      mat.transparent = see;
      mat.depthWrite = !see;
      mat.needsUpdate = true;
    }
    mat.opacity = value;
  }
}

export function glowMaterial(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    // Chỉ cộng ánh sáng, giữ nguyên độ đục của canvas: canvas trong suốt để lộ nền trang phía sau,
    // nếu ghi cả độ đục thì phần màu đen của hiệu ứng sẽ che nền thành vệt tối.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    side: THREE.DoubleSide,
  });
}

// Nhóm con xoay quanh điểm (x, y, z); thêm chi tiết toạ độ xe vào inner như bình thường.
export function pivotAt(x, y, z = 0) {
  const outer = new THREE.Group();
  outer.position.set(x, y, z);
  const inner = new THREE.Group();
  inner.position.set(-x, -y, -z);
  outer.add(inner);
  return { outer, inner };
}

// Khối vô hình dày hơn chi tiết thật, chỉ dùng để bấm chọn.
export function asPickProxy(m) {
  m.material = PROXY_MATERIAL;
  m.visible = false;
  m.castShadow = false;
  m.receiveShadow = false;
  m.userData.pickOnly = true;
  return m;
}

export function group(...children) {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}
