import { describe, expect, it } from 'vitest';
import {
  approach,
  CRUISE_RPM,
  degreesPerSecond,
  engineLevel,
  firingsBetween,
  IDLE_RPM,
  musicLevel,
  targetRpm,
} from '../src/engine-model.js';

describe('firingsBetween', () => {
  it('fires cylinder 0 at 0 degrees and cylinder 1 at 180 in each 720-degree cycle', () => {
    expect(firingsBetween(-1, 719)).toEqual([
      { angle: 0, cylinder: 0 },
      { angle: 180, cylinder: 1 },
    ]);
  });

  it('rests for 540 degrees between each pair, the 180-degree twin rhythm', () => {
    const angles = firingsBetween(-1, 2159).map((f) => f.angle);
    expect(angles).toEqual([0, 180, 720, 900, 1440, 1620]);
    const gaps = angles.slice(1).map((a, i) => a - angles[i]);
    expect(gaps).toEqual([180, 540, 180, 540, 180]);
  });

  it('excludes the start of the range and includes its end', () => {
    expect(firingsBetween(0, 180).map((f) => f.angle)).toEqual([180]);
  });

  it('gives the same firings however the range is split', () => {
    const whole = firingsBetween(-1, 5000);
    const parts = [];
    for (let from = -1; from < 5000; from += 37.3) parts.push(...firingsBetween(from, Math.min(from + 37.3, 5000)));
    expect(parts).toEqual(whole);
  });

  it('fires once per crank revolution on average, so rpm / 60 times a second', () => {
    const rpm = 3000;
    const count = firingsBetween(-1, degreesPerSecond(rpm) * 10 - 1).length;
    expect(count).toBe((rpm / 60) * 10);
  });

  it('turns the rhythm into time: pairs 1/2 revolution apart, then 3/2 revolutions', () => {
    const rpm = 1300;
    const times = firingsBetween(-1, 1440).map((f) => f.angle / degreesPerSecond(rpm));
    const revolution = 60 / rpm;
    expect(times[1] - times[0]).toBeCloseTo(revolution / 2, 10);
    expect(times[2] - times[1]).toBeCloseTo(revolution * 1.5, 10);
  });
});

describe('targetRpm', () => {
  const times = Array.from({ length: 200 }, (_, i) => i * 0.37);

  it('idles near 1300 rpm when standing still', () => {
    for (const t of times) expect(Math.abs(targetRpm(0, t) - IDLE_RPM)).toBeLessThan(60);
  });

  it('cruises between 2800 and 3800 rpm when riding', () => {
    for (const t of times) {
      expect(targetRpm(1, t)).toBeGreaterThan(2800);
      expect(targetRpm(1, t)).toBeLessThan(3800);
    }
    expect(CRUISE_RPM).toBeGreaterThan(IDLE_RPM);
  });

  it('blends between idle and cruise as the ride builds', () => {
    expect(targetRpm(0.5, 2)).toBeGreaterThan(targetRpm(0, 2));
    expect(targetRpm(0.5, 2)).toBeLessThan(targetRpm(1, 2));
  });

  it('never leaves a believable range, whatever the ride strength', () => {
    for (const k of [-1, 0, 0.3, 1, 5]) {
      for (const t of times) {
        expect(targetRpm(k, t)).toBeGreaterThanOrEqual(900);
        expect(targetRpm(k, t)).toBeLessThanOrEqual(6000);
      }
    }
  });
});

describe('approach', () => {
  it('never overshoots the target', () => {
    expect(approach(1000, 1100, 10)).toBe(1100);
    expect(approach(3000, 2900, 10)).toBe(2900);
  });

  it('revs up faster than it falls back, like a real engine', () => {
    const up = approach(1000, 5000, 0.1) - 1000;
    const down = 5000 - approach(5000, 1000, 0.1);
    expect(up).toBeGreaterThan(down);
  });

  it('moves a limited amount per second', () => {
    expect(approach(1000, 5000, 0.1) - 1000).toBeLessThan(400);
  });
});

describe('engineLevel', () => {
  const base = { ride: 0, exploded: 0, focused: false, enabled: true };

  it('is silent when sound is off', () => {
    expect(engineLevel({ ...base, enabled: false })).toBe(0);
  });

  it('is louder when riding than when idling', () => {
    expect(engineLevel({ ...base, ride: 1 })).toBeGreaterThan(engineLevel(base));
  });

  it('falls silent as the bike is taken apart', () => {
    expect(engineLevel({ ...base, ride: 1, exploded: 1 })).toBe(0);
    const half = engineLevel({ ...base, ride: 1, exploded: 0.5 });
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(engineLevel({ ...base, ride: 1 }));
  });

  it('ducks while a part is open so the note card can be read', () => {
    expect(engineLevel({ ...base, focused: true })).toBeLessThan(engineLevel(base));
  });

  it('stays within 0 and 1', () => {
    for (const ride of [0, 0.5, 1, 3]) {
      const level = engineLevel({ ...base, ride });
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });
});

describe('engineLevel while the memory photos show', () => {
  const riding = { ride: 1, exploded: 0, focused: false, enabled: true };

  it('is much quieter, but still audible', () => {
    const quiet = engineLevel({ ...riding, memories: 1 });
    expect(quiet).toBeLessThan(engineLevel({ ...riding, memories: 0 }) * 0.5);
    expect(quiet).toBeGreaterThan(0);
  });

  it('fades gradually as the photos appear', () => {
    const none = engineLevel({ ...riding, memories: 0 });
    const half = engineLevel({ ...riding, memories: 0.5 });
    const all = engineLevel({ ...riding, memories: 1 });
    expect(half).toBeLessThan(none);
    expect(half).toBeGreaterThan(all);
  });

  it('is unchanged when no memories value is given', () => {
    expect(engineLevel(riding)).toBe(engineLevel({ ...riding, memories: 0 }));
  });
});

describe('musicLevel', () => {
  it('is silent when sound is off', () => {
    expect(musicLevel({ memories: 1, enabled: false })).toBe(0);
  });

  it('is silent while no photos are showing', () => {
    expect(musicLevel({ memories: 0, enabled: true })).toBe(0);
  });

  it('follows how visible the photos are', () => {
    expect(musicLevel({ memories: 0.5, enabled: true })).toBeGreaterThan(0);
    expect(musicLevel({ memories: 0.5, enabled: true })).toBeLessThan(musicLevel({ memories: 1, enabled: true }));
  });

  it('stays within 0 and 1', () => {
    for (const memories of [-1, 0, 0.4, 1, 3]) {
      const level = musicLevel({ memories, enabled: true });
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });
});
