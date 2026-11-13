import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { config } from './config.js';
import { createMemories } from './memories.js';
import { createRoad } from './road.js';

const FOV = 28;
const FLOOR_SHADOW = 0.5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Phần màn hình còn trống cho chiếc xe, và độ dời khung hình để xe nằm giữa phần đó.
const LAYOUTS = {
  overview: { visible: [0.96, 0.8], shift: [0, 0.06] },
  // Có thêm dải ảnh phía trên xe nên dùng gần hết chiều cao màn hình.
  memories: { visible: [0.96, 0.9], shift: [0, 0.03] },
  focusLandscape: { visible: [0.58, 0.92], shift: [0.18, 0] },
  focusPortrait: { visible: [0.94, 0.46], shift: [0, 0.25] },
};

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.localClippingEnabled = true; // mặt xăng trong bình
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Đèn đứng yên nên chỉ cần vẽ lại bóng khi bộ phận di chuyển, nhẹ hơn nhiều trên điện thoại.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);

  const lamp = new THREE.DirectionalLight('#ffd9a0', 3.2);
  lamp.position.set(1.6, 5, 3);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.left = -3.5;
  lamp.shadow.camera.right = 3.5;
  lamp.shadow.camera.top = 3.5;
  lamp.shadow.camera.bottom = -3.5;
  lamp.shadow.bias = -0.0005;
  lamp.shadow.radius = 5;
  scene.add(lamp);

  const rim = new THREE.DirectionalLight('#8fc3d6', 2.4);
  rim.position.set(-3, 2.2, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight('#ffe9cc', 0.7);
  fill.position.set(-2, 1, 4);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 48),
    new THREE.ShadowMaterial({ opacity: FLOOR_SHADOW }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const road = createRoad();
  scene.add(road.object);

  const memories = createMemories();
  scene.add(memories.object);

  const bike = new THREE.Group();
  scene.add(bike);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotateSpeed = config.motion.autoRotateSpeed;

  let width = 1;
  let height = 1;
  const shift = { x: 0, y: 0 };

  function applyShift() {
    camera.setViewOffset(width, height, shift.x * width, shift.y * height, width, height);
  }

  function setShift(x, y) {
    shift.x = x;
    shift.y = y;
    applyShift();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyShift();
    camera.updateProjectionMatrix();
  }

  function layoutFor(mode) {
    if (mode === 'overview' || mode === 'memories') return LAYOUTS[mode];
    return camera.aspect < 1 ? LAYOUTS.focusPortrait : LAYOUTS.focusLandscape;
  }

  // Khoảng cách nhỏ nhất để cả khung bao lọt vào phần màn hình còn trống.
  function poseFor(box, direction, mode, margin = 1.08) {
    const layout = layoutFor(mode);
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const tanVisibleV = tanV * layout.visible[1];
    const tanVisibleH = tanV * camera.aspect * layout.visible[0];
    const target = box.getCenter(new THREE.Vector3());
    const right = WORLD_UP.clone().cross(direction).normalize();
    const up = direction.clone().cross(right);
    let distance = 0;
    const corner = new THREE.Vector3();
    for (let i = 0; i < 8; i += 1) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      corner.sub(target);
      const toward = corner.dot(direction);
      distance = Math.max(
        distance,
        Math.abs(corner.dot(right)) / tanVisibleH + toward,
        Math.abs(corner.dot(up)) / tanVisibleV + toward,
      );
    }
    distance *= margin;
    return {
      position: target.clone().addScaledVector(direction, distance),
      target,
      shift: { x: layout.shift[0], y: layout.shift[1] },
    };
  }

  function currentPose() {
    return { position: camera.position.clone(), target: controls.target.clone(), shift: { ...shift } };
  }

  function applyPose(from, to, k) {
    camera.position.lerpVectors(from.position, to.position, k);
    controls.target.lerpVectors(from.target, to.target, k);
    setShift(
      THREE.MathUtils.lerp(from.shift.x, to.shift.x, k),
      THREE.MathUtils.lerp(from.shift.y, to.shift.y, k),
    );
  }

  // 0 là bóng đầy đủ, 1 là không còn bóng trên sàn.
  function fadeFloorShadow(amount) {
    floor.material.opacity = FLOOR_SHADOW * (1 - amount);
  }

  resize();

  return {
    renderer,
    scene,
    camera,
    controls,
    bike,
    road,
    memories,
    resize,
    poseFor,
    currentPose,
    applyPose,
    fadeFloorShadow,
  };
}
