import { describe, expect, it } from 'vitest';
import { ARPEGGIO, BAR_STEPS, CHORDS, midiToHz, STEP_SECONDS, stepAt } from '../src/music-model.js';

describe('midiToHz', () => {
  it('puts concert A at 440 Hz', () => {
    expect(midiToHz(69)).toBe(440);
  });

  it('doubles every octave', () => {
    expect(midiToHz(81)).toBeCloseTo(880, 8);
    expect(midiToHz(57)).toBeCloseTo(220, 8);
  });

  it('puts middle C near 261.6 Hz', () => {
    expect(midiToHz(60)).toBeCloseTo(261.63, 1);
  });
});

describe('the progression', () => {
  it('has eight bars, a gentle loop', () => {
    expect(CHORDS).toHaveLength(8);
  });

  it('keeps every bass note below the chord it supports', () => {
    for (const chord of CHORDS) expect(chord.bass).toBeLessThan(Math.min(...chord.notes));
  });

  it('keeps the arpeggio notes in a warm, singable range', () => {
    for (const { notes } of CHORDS) {
      for (const note of notes) {
        expect(note).toBeGreaterThanOrEqual(52);
        expect(note).toBeLessThanOrEqual(76);
      }
    }
  });

  it('voices each chord ascending, so the arpeggio rises before it falls', () => {
    for (const { notes } of CHORDS) expect([...notes].sort((a, b) => a - b)).toEqual(notes);
  });

  it('starts and ends on the home chord area so the loop sounds resolved', () => {
    expect(CHORDS[0].bass % 12).toBe(0); // Đô
    expect(CHORDS.at(-1).bass % 12).toBe(7); // Sol, kéo về Đô khi lặp lại
  });
});

describe('stepAt', () => {
  const total = CHORDS.length * BAR_STEPS;

  it('lays eight steps in a bar and moves to the next chord each bar', () => {
    expect(stepAt(0).chord).toBe(CHORDS[0]);
    expect(stepAt(BAR_STEPS - 1).chord).toBe(CHORDS[0]);
    expect(stepAt(BAR_STEPS).chord).toBe(CHORDS[1]);
  });

  it('plays the bass and the pad only on the first step of a bar', () => {
    expect(stepAt(0).downbeat).toBe(true);
    expect(stepAt(1).downbeat).toBe(false);
    expect(stepAt(BAR_STEPS).downbeat).toBe(true);
  });

  it('plays a note of the current chord on every step', () => {
    for (let i = 0; i < total; i += 1) {
      const { chord, note } = stepAt(i);
      expect(chord.notes).toContain(note);
    }
  });

  it('follows the arpeggio pattern inside each bar', () => {
    const bar = Array.from({ length: BAR_STEPS }, (_, i) => stepAt(i));
    expect(bar.map((s) => s.chord.notes.indexOf(s.note))).toEqual(ARPEGGIO);
  });

  it('loops seamlessly after the last bar', () => {
    for (let i = 0; i < total; i += 1) expect(stepAt(i + total)).toEqual(stepAt(i));
  });

  it('keeps an unhurried tempo, between 60 and 80 beats a minute', () => {
    const bpm = 60 / (STEP_SECONDS * 2); // hai nốt móc đơn một phách
    expect(bpm).toBeGreaterThanOrEqual(60);
    expect(bpm).toBeLessThanOrEqual(80);
  });
});
