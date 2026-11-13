import { describe, expect, it } from 'vitest';
import { bodyPose, RIDE_SPEED, roadBumps, WHEELBASE } from '../src/ride.js';

describe('roadBumps', () => {
  it('never pushes a wheel below its rest position', () => {
    for (let t = 0; t < 30; t += 0.07) {
      const { front, rear } = roadBumps(t);
      expect(front).toBeGreaterThanOrEqual(0);
      expect(rear).toBeGreaterThanOrEqual(0);
    }
  });

  it('stays within a believable suspension travel', () => {
    for (let t = 0; t < 30; t += 0.07) {
      expect(roadBumps(t).front).toBeLessThan(0.06);
    }
  });

  it('hits the rear wheel exactly one wheelbase of travel after the front', () => {
    const delay = WHEELBASE / RIDE_SPEED;
    expect(roadBumps(5 + delay).rear).toBeCloseTo(roadBumps(5).front, 10);
  });
});

describe('bodyPose', () => {
  const groundHeightAt = (x, { y, pitch }) => y + x * Math.tan(pitch);

  it('keeps both tyres on the road when one wheel rises', () => {
    const pose = bodyPose(0.04, 0.01);
    expect(groundHeightAt(WHEELBASE / 2, pose) + 0.04).toBeCloseTo(0, 3);
    expect(groundHeightAt(-WHEELBASE / 2, pose) + 0.01).toBeCloseTo(0, 3);
  });

  it('stays level when both wheels are at rest', () => {
    expect(bodyPose(0, 0)).toEqual({ y: 0, pitch: 0 });
  });
});
