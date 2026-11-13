import * as THREE from 'three';

const LENGTH = 14;
const WIDTH = 2.4;
const DASHES = 14;
const DASH_GAP = LENGTH / DASHES;

// Mặt đường chỉ hiện khi xe chạy: vạch kẻ trôi về phía sau, mờ dần ở hai đầu để không lộ mép.
export function createRoad() {
  const road = new THREE.Group();
  road.visible = false;

  const geometry = new THREE.PlaneGeometry(LENGTH, WIDTH, 28, 1);
  const position = geometry.attributes.position;
  const fade = new Float32Array(position.count * 4);
  for (let i = 0; i < position.count; i += 1) {
    const alpha = Math.max(1 - Math.abs(position.getX(i)) / (LENGTH / 2), 0) ** 0.7;
    fade.set([1, 1, 1, alpha], i * 4);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(fade, 4));
  const surface = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: '#0d1417', vertexColors: true, transparent: true, depthWrite: false }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = -0.004;
  surface.renderOrder = -1;
  road.add(surface);

  const dashGeometry = new THREE.PlaneGeometry(0.38, 0.035);
  dashGeometry.rotateX(-Math.PI / 2);
  const dashes = [];
  for (const z of [-0.55, 0.55]) {
    for (let i = 0; i < DASHES; i += 1) {
      const dash = new THREE.Mesh(
        dashGeometry,
        new THREE.MeshBasicMaterial({ color: '#c9c2ad', transparent: true, depthWrite: false }),
      );
      dash.position.set(0, -0.002, z);
      dash.renderOrder = -1;
      road.add(dash);
      dashes.push({ dash, offset: i * DASH_GAP });
    }
  }

  return {
    object: road,
    // distance: quãng đường xe đã đi; strength: 0 là ẩn, 1 là hiện rõ.
    update(distance, strength) {
      road.visible = strength > 0;
      if (!road.visible) return;
      surface.material.opacity = 0.75 * strength;
      for (const { dash, offset } of dashes) {
        const x = (((offset - distance) % LENGTH) + LENGTH) % LENGTH - LENGTH / 2;
        dash.position.x = x;
        dash.material.opacity = 0.55 * strength * Math.max(1 - Math.abs(x) / (LENGTH / 2), 0);
      }
    },
  };
}
