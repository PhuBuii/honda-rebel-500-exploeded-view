import * as THREE from 'three';
import { config } from '../config.js';

// Mỗi bộ phận có bộ vật liệu riêng để làm mờ độc lập khi đang xem bộ phận khác.
export function createMaterials() {
  const { colors } = config;
  const standard = (color, metalness, roughness, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, side: THREE.DoubleSide, ...extra });
  return {
    paint: standard(colors.paint, 0.35, 0.3),
    frame: standard(colors.frame, 0.5, 0.42),
    engine: standard(colors.engine, 0.6, 0.55),
    cover: standard(colors.engine, 0.7, 0.3), // nắp máy đen bóng, bắt sáng rõ hơn thân máy
    bolt: standard('#6f7274', 0.9, 0.38),
    metal: standard(colors.metal, 0.95, 0.28),
    accent: standard(colors.accent, 0.85, 0.42),
    lcd: standard('#10222e', 0.2, 0.2, { emissive: '#2f7fb8', emissiveIntensity: 0.35 }),
    rubber: standard(colors.rubber, 0, 0.88),
    leather: standard(colors.leather, 0, 0.62),
    lens: standard('#d9c8a4', 0.3, 0.18, { emissive: '#ffb860', emissiveIntensity: 0.42 }),
    tailLight: standard('#7a1410', 0.1, 0.3, { emissive: '#b81d12', emissiveIntensity: 0.7 }),
    signal: standard('#8a5a18', 0.2, 0.3, { emissive: '#9a5d10', emissiveIntensity: 0.25 }),
  };
}
