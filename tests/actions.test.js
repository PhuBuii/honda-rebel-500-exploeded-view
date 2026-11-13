import { describe, expect, it } from 'vitest';
import { firingGlow, pistonTravel } from '../src/parts/engine.js';
import { buildParts } from '../src/parts/index.js';

// Bánh xe giữ nguyên góc đã quay khi dừng, nên không có tư thế nghỉ cố định.
const SPINS_FREELY = new Set(['frontWheel', 'rearWheel']);

function snapshot(part) {
  part.object.updateWorldMatrix(true, true);
  const poses = [];
  part.object.traverse((o) => {
    if (o.isMesh && !o.userData.pickOnly && !o.userData.effect) poses.push([...o.matrixWorld.elements]);
  });
  return poses;
}

function effectVisible(part) {
  let visible = false;
  part.object.traverse((o) => {
    // Ẩn nút gốc là ẩn cả nhóm, nên chỉ xét nút gốc của mỗi hiệu ứng.
    if (o.userData.effect && !o.parent?.userData.effect && o.visible) visible = true;
  });
  return visible;
}

describe('part actions', () => {
  const parts = buildParts();

  it('gives every part an action', () => {
    for (const part of parts) expect(part.action, part.id).toBeTypeOf('function');
  });

  it('visibly changes every part while running', () => {
    for (const part of parts) {
      const rest = snapshot(part);
      part.action(0.37, 1, 0.016);
      const moved = JSON.stringify(snapshot(part)) !== JSON.stringify(rest);
      expect(moved || effectVisible(part), part.id).toBe(true);
    }
  });

  it('returns to the rest pose when faded out', () => {
    for (const part of buildParts()) {
      if (SPINS_FREELY.has(part.id)) continue;
      const rest = snapshot(part);
      part.action(0.37, 1, 0.016);
      part.action(0.37, 0, 0);
      expect(snapshot(part), part.id).toEqual(rest);
      expect(effectVisible(part), part.id).toBe(false);
    }
  });

  it('offers suspension controls for the riding mode', () => {
    const parts = buildParts();
    const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
    for (const [id, control] of [['fork', 'setTravel'], ['shock', 'setTravel'], ['frame', 'setSwing']]) {
      const part = byId[id];
      const rest = snapshot(part);
      part.drive[control](0.03);
      expect(snapshot(part), id).not.toEqual(rest);
      part.drive[control](0);
      expect(snapshot(part), id).toEqual(rest);
    }
  });

  it('keeps the shells solid when riding without revealing the insides', () => {
    for (const part of buildParts().filter((p) => ['engine', 'exhaust', 'fender'].includes(p.id))) {
      part.action(0.37, 1, 0.016, { reveal: false });
      part.object.traverse((o) => {
        if (o.isMesh && !o.userData.effect && !o.userData.pickOnly) {
          expect(o.material.opacity, part.id).toBe(1);
        }
      });
    }
  });

  it('hides the engine internals when not revealing them', () => {
    const engine = buildParts().find((p) => p.id === 'engine');
    engine.action(0.37, 1, 0.016, { reveal: false });
    expect(effectVisible(engine)).toBe(false);
  });

  it('keeps wheels still when faded out', () => {
    const wheel = buildParts().find((p) => p.id === 'frontWheel');
    wheel.action(1, 1, 0.1);
    const angle = wheel.object.rotation.z;
    expect(angle).not.toBe(0);
    wheel.action(2, 0, 0.1);
    expect(wheel.object.rotation.z).toBe(angle);
  });

  it('spins wheels forward, clockwise seen from the right side', () => {
    const wheel = buildParts().find((p) => p.id === 'rearWheel');
    wheel.action(1, 1, 0.1);
    expect(wheel.object.rotation.z).toBeLessThan(0);
  });
});

describe('engine mechanics', () => {
  it('moves the piston by the real 66.8 mm stroke', () => {
    expect(pistonTravel(0) - pistonTravel(Math.PI)).toBeCloseTo(0.0668, 5);
  });

  it('fires cylinders 180 degrees apart, then rests for 540 degrees', () => {
    expect(firingGlow(0, 0)).toBe(1);
    expect(firingGlow(Math.PI, 1)).toBe(1);
    // Vòng quay thứ hai trong chu kỳ 4 thì không có lần nổ nào.
    expect(firingGlow(2 * Math.PI, 0)).toBe(0);
    expect(firingGlow(3 * Math.PI, 1)).toBe(0);
  });

  it('fires each cylinder again after two crank revolutions', () => {
    expect(firingGlow(4 * Math.PI, 0)).toBeCloseTo(1, 5);
  });
});
