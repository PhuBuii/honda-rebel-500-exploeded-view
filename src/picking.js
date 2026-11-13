import * as THREE from 'three';

// Chi tiết thật được ưu tiên; nếu trượt thì xét vùng bấm rộng và chọn bộ phận nhỏ nhất,
// để bánh xe to không lấn mất các chi tiết nhỏ gần nó.
export function createPicker({ parts, camera, canvas }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const solid = [];
  const proxies = [];
  const volumes = new Map();

  for (const part of parts) {
    part.object.traverse((o) => {
      if (!o.isMesh || o.userData.effect) return;
      (o.userData.pickOnly ? proxies : solid).push(o);
      if (o.userData.pickOnly) {
        o.geometry.computeBoundingBox();
        const size = o.geometry.boundingBox.getSize(new THREE.Vector3());
        volumes.set(o, size.x * size.y * size.z);
      }
    });
  }

  return function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);

    const direct = raycaster.intersectObjects(solid, false);
    if (direct.length) return direct[0].object.userData.partId;

    const near = raycaster.intersectObjects(proxies, false);
    if (!near.length) return null;
    const smallest = near.reduce((a, b) => (volumes.get(b.object) < volumes.get(a.object) ? b : a));
    return smallest.object.userData.partId;
  };
}
