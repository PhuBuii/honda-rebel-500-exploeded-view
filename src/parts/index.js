import * as THREE from 'three';
import { buildFender, buildHeadlight, buildSeat, buildTank } from './bodywork.js';
import { buildEngine } from './engine.js';
import { buildFrame } from './frame.js';
import { buildFork, buildHandlebar } from './front-end.js';
import { buildExhaust, buildShock } from './rear-end.js';
import { asPickProxy, mesh } from './shapes.js';
import { buildWheel, FRONT_AXLE_X, REAR_AXLE_X } from './wheel.js';

// explodeOffset: vị trí của bộ phận so với lúc lắp, khi xe đã bung.
// portraitOffset: thay cho explodeOffset khi màn hình dọc, để bố cục hẹp lại và xe to hơn.
// focusDirection: hướng đặt máy quay khi xem cận cảnh.
const DEFINITIONS = [
  { id: 'frame', build: buildFrame, explodeOffset: [0, 0, 0], focusDirection: [0.25, 0.2, 1] },
  { id: 'tank', build: buildTank, explodeOffset: [0.1, 0.62, 0], focusDirection: [0.5, 0.7, 1] },
  { id: 'seat', build: buildSeat, explodeOffset: [-0.18, 0.58, 0], focusDirection: [-0.4, 0.7, 1] },
  { id: 'handlebar', build: buildHandlebar, explodeOffset: [0.42, 0.6, 0], focusDirection: [0.75, 0.55, 0.75] },
  { id: 'headlight', build: buildHeadlight, explodeOffset: [0.66, 0.42, 0], focusDirection: [0.5, 0.2, 1] },
  { id: 'fork', build: buildFork, explodeOffset: [0.5, 0.06, 0], focusDirection: [0.4, 0.1, 1] },
  {
    id: 'frontWheel',
    build: () => buildWheel({ x: FRONT_AXLE_X, width: 0.13, front: true }),
    explodeOffset: [1.2, 0, 0],
    portraitOffset: [0.62, -0.42, 0],
    focusDirection: [0.35, 0.12, 1],
  },
  {
    id: 'rearWheel',
    build: () => buildWheel({ x: REAR_AXLE_X, width: 0.15, front: false }),
    explodeOffset: [-0.85, 0, 0],
    portraitOffset: [-0.55, 0, 0],
    focusDirection: [-0.35, 0.12, 1],
  },
  { id: 'engine', build: buildEngine, explodeOffset: [0.02, -0.62, 0.1], focusDirection: [0.35, 0.15, 1] },
  { id: 'exhaust', build: buildExhaust, explodeOffset: [-0.75, -0.52, 0.2], focusDirection: [0.1, 0.05, 1] },
  { id: 'shock', build: buildShock, explodeOffset: [-0.32, 0.1, -0.1], focusDirection: [-0.5, 0.1, 1] },
  { id: 'fender', build: buildFender, explodeOffset: [-0.42, 0.5, 0], focusDirection: [-0.7, 0.5, 0.7] },
];

// Khung bao của phần nhìn thấy được, không tính khối vô hình để bấm chọn.
export function partBounds(object) {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3();
  object.traverse((o) => {
    if (o.isMesh && !o.userData.pickOnly && !o.userData.effect) bounds.expandByObject(o);
  });
  return bounds;
}

function addBoxProxy(object) {
  const bounds = partBounds(object);
  const size = bounds.getSize(new THREE.Vector3()).addScalar(0.07);
  const proxy = asPickProxy(mesh(new THREE.BoxGeometry(size.x, size.y, size.z)));
  object.worldToLocal(bounds.getCenter(proxy.position));
  object.add(proxy);
}

export function buildParts() {
  return DEFINITIONS.map(({ id, build, explodeOffset, portraitOffset, focusDirection }) => {
    const object = build();
    let hasProxy = false;
    object.traverse((o) => {
      if (o.userData.pickOnly) hasProxy = true;
    });
    if (!hasProxy) addBoxProxy(object);
    object.traverse((o) => {
      o.userData.partId = id;
    });
    return {
      id,
      object,
      assembledPosition: object.position.clone(),
      explodeOffset: new THREE.Vector3(...explodeOffset),
      portraitOffset: new THREE.Vector3(...(portraitOffset ?? explodeOffset)),
      focusDirection: new THREE.Vector3(...focusDirection).normalize(),
      // Chuyển động khi xem cận cảnh: action(thời gian, độ mạnh 0..1, bước thời gian).
      action: object.userData.action,
      // Điều khiển trực tiếp hệ thống treo khi xe đang chạy (chỉ phuộc, giảm xóc, càng sau).
      drive: object.userData.drive,
    };
  });
}
