import { describe, expect, it } from 'vitest';
import { createMemories } from '../src/memories.js';

describe('createMemories', () => {
  it('has no photos and stays hidden until some are loaded', () => {
    const memories = createMemories();
    expect(memories.count).toBe(0);
    memories.update(1, 1, 1, 0);
    expect(memories.object.visible).toBe(false);
  });

  it('loads nothing from an empty list without touching the page', async () => {
    expect(await createMemories().load([])).toBe(0);
  });

  it('raises the lane box by the same lift as the bike when it is exploded', () => {
    const memories = createMemories();
    const rest = memories.bounds(0);
    const lifted = memories.bounds(0.62);
    expect(lifted.min.y - rest.min.y).toBeCloseTo(0.62, 10);
    expect(lifted.max.y - rest.max.y).toBeCloseTo(0.62, 10);
  });

  it('keeps the lane behind the bike and above the road', () => {
    const { min, max } = createMemories().bounds(0);
    expect(max.z).toBeLessThan(0);
    expect(min.y).toBeGreaterThan(0.5);
  });
});
