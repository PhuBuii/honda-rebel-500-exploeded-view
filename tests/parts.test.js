import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../src/part-ids.js';
import { buildParts, partBounds } from '../src/parts/index.js';

const parts = buildParts();

function countTriangles(root) {
  let total = 0;
  root.traverse((o) => {
    if (!o.isMesh || o.userData.pickOnly) return;
    const g = o.geometry;
    total += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return total;
}

describe('buildParts', () => {
  it('builds exactly the 12 parts in PART_IDS', () => {
    expect(PART_IDS).toHaveLength(12);
    expect(parts.map((p) => p.id).sort()).toEqual([...PART_IDS].sort());
  });

  it('gives every part an explode offset, except the frame which stays put', () => {
    for (const p of parts) {
      const length = p.explodeOffset.length();
      if (p.id === 'frame') expect(length).toBe(0);
      else expect(length).toBeGreaterThan(0);
    }
  });

  it('gives every part a pick volume', () => {
    for (const p of parts) {
      let proxies = 0;
      p.object.traverse((o) => {
        if (o.userData.pickOnly) proxies += 1;
      });
      expect(proxies, p.id).toBeGreaterThan(0);
    }
  });

  it('stays within the triangle budget', () => {
    const total = parts.reduce((sum, p) => sum + countTriangles(p.object), 0);
    expect(total).toBeLessThanOrEqual(150000);
  });

  it('keeps the assembled bike at the real proportions', () => {
    const bike = new THREE.Box3();
    for (const p of parts) bike.union(partBounds(p.object));
    const size = bike.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(2.0);
    expect(size.x).toBeLessThan(2.4);
    expect(bike.min.y).toBeGreaterThanOrEqual(-0.01);
  });
});
