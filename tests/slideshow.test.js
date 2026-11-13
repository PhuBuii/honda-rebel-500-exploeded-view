import { describe, expect, it } from 'vitest';
import { focusAt, LANE_SPEED, slotCount, slotPhoto, slotX, SPACING } from '../src/slideshow.js';

describe('slotCount', () => {
  it('has no frames without photos', () => {
    expect(slotCount(0)).toBe(0);
  });

  it('repeats a few photos so the lane is always full', () => {
    expect(slotCount(1)).toBeGreaterThanOrEqual(6);
    expect(slotCount(4)).toBeGreaterThanOrEqual(6);
  });

  it('keeps the order seamless where the lane wraps around', () => {
    for (const n of [1, 2, 3, 4, 5, 7]) expect(slotCount(n) % n, `n=${n}`).toBe(0);
  });

  it('uses one frame per photo when there are plenty', () => {
    expect(slotCount(10)).toBe(10);
  });
});

describe('slotPhoto', () => {
  it('cycles through the photos in order', () => {
    expect([0, 1, 2, 3, 4].map((slot) => slotPhoto(slot, 3))).toEqual([0, 1, 2, 0, 1]);
  });
});

describe('slotX', () => {
  it('puts the first frame in the middle at the start', () => {
    expect(slotX(0, 0, 6)).toBe(0);
  });

  it('spaces neighbouring frames evenly', () => {
    expect(slotX(1, 0, 6) - slotX(0, 0, 6)).toBeCloseTo(SPACING, 10);
  });

  it('slides frames toward the back of the bike as the lane advances', () => {
    expect(slotX(1, 1, 6)).toBeCloseTo(SPACING - 1, 10);
  });

  it('keeps every frame inside one lap, so one leaving on the left re-enters on the right', () => {
    const length = 6 * SPACING;
    for (let offset = 0; offset < 60; offset += 0.37) {
      for (let slot = 0; slot < 6; slot += 1) {
        const x = slotX(slot, offset, 6);
        expect(x).toBeGreaterThanOrEqual(-length / 2);
        expect(x).toBeLessThan(length / 2);
      }
    }
  });

  it('repeats exactly after one lap', () => {
    const length = 6 * SPACING;
    expect(slotX(2, 5 + length, 6)).toBeCloseTo(slotX(2, 5, 6), 10);
  });
});

describe('focusAt', () => {
  it('is full in the middle of the screen', () => {
    expect(focusAt(0)).toBe(1);
  });

  it('is symmetric on both sides', () => {
    expect(focusAt(0.9)).toBeCloseTo(focusAt(-0.9), 10);
  });

  it('fades to nothing by the time the next frame is in the middle', () => {
    expect(focusAt(SPACING)).toBe(0);
    expect(focusAt(SPACING * 2)).toBe(0);
  });

  it('only ever decreases moving away from the middle', () => {
    let last = 1;
    for (let x = 0; x <= SPACING; x += 0.1) {
      const k = focusAt(x);
      expect(k).toBeLessThanOrEqual(last + 1e-12);
      last = k;
    }
  });
});

describe('pacing', () => {
  it('leaves each photo long enough to look at, without dragging', () => {
    const seconds = SPACING / LANE_SPEED;
    expect(seconds).toBeGreaterThanOrEqual(2.5);
    expect(seconds).toBeLessThanOrEqual(6);
  });
});
