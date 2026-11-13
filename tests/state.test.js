import { describe, expect, it } from 'vitest';
import {
  close,
  createState,
  explode,
  focus,
  isBrowsing,
  replay,
  setLayout,
  setMemories,
  setRiding,
} from '../src/state.js';

const IDS = ['a', 'b'];
const exploded = () => explode(createState(IDS));

describe('state', () => {
  it('starts on the intro screen with nothing seen', () => {
    const s = createState(IDS);
    expect(s.screen).toBe('intro');
    expect(s.focused).toBeNull();
    expect(s.seen.size).toBe(0);
  });

  it('moves from intro to exploded', () => {
    expect(exploded().screen).toBe('exploded');
  });

  it('ignores focus on the intro screen', () => {
    expect(focus(createState(IDS), 'a').screen).toBe('intro');
  });

  it('ignores focus on an unknown part', () => {
    expect(focus(exploded(), 'nope').screen).toBe('exploded');
  });

  it('marks a part as seen when it is focused', () => {
    const s = focus(exploded(), 'a');
    expect(s.screen).toBe('focused');
    expect(s.focused).toBe('a');
    expect(s.seen.has('a')).toBe(true);
  });

  it('ignores focus on another part while one is open', () => {
    expect(focus(focus(exploded(), 'a'), 'b').focused).toBe('a');
  });

  it('returns to exploded when closing with parts left to see', () => {
    const s = close(focus(exploded(), 'a'));
    expect(s.screen).toBe('exploded');
    expect(s.focused).toBeNull();
  });

  it('goes to the finale when closing the last unseen part', () => {
    const s = close(focus(close(focus(exploded(), 'a')), 'b'));
    expect(s.screen).toBe('finale');
  });

  it('does not count a part twice', () => {
    const s = focus(close(focus(exploded(), 'a')), 'a');
    expect(s.seen.size).toBe(1);
    expect(close(s).screen).toBe('exploded');
  });

  it('keeps progress on replay', () => {
    const finale = close(focus(close(focus(exploded(), 'a')), 'b'));
    const s = replay(finale);
    expect(s.screen).toBe('exploded');
    expect(s.seen.size).toBe(2);
  });

  it('does not repeat the finale when re-reading a part after replay', () => {
    const finale = close(focus(close(focus(exploded(), 'a')), 'b'));
    expect(close(focus(replay(finale), 'a')).screen).toBe('exploded');
  });

  it('ignores close when nothing is open', () => {
    expect(close(exploded()).screen).toBe('exploded');
  });

  it('ignores replay outside the finale', () => {
    expect(replay(exploded()).screen).toBe('exploded');
    expect(replay(createState(IDS)).screen).toBe('intro');
  });
});

describe('layouts', () => {
  const assembled = () => setLayout(createState(IDS), 'assembled');

  it('can start on the whole bike without exploding it', () => {
    expect(assembled().screen).toBe('assembled');
  });

  it('allows picking a part on the whole bike', () => {
    const s = focus(assembled(), 'a');
    expect(s.screen).toBe('focused');
    expect(s.focused).toBe('a');
  });

  it('returns to the whole bike after closing a part opened there', () => {
    expect(close(focus(assembled(), 'a')).screen).toBe('assembled');
  });

  it('switches between layouts and keeps progress', () => {
    const seen = close(focus(assembled(), 'a'));
    const s = setLayout(seen, 'exploded');
    expect(s.screen).toBe('exploded');
    expect(s.seen.has('a')).toBe(true);
    expect(close(focus(s, 'b')).screen).toBe('finale');
  });

  it('ignores layout changes while a part is open', () => {
    expect(setLayout(focus(assembled(), 'a'), 'exploded').screen).toBe('focused');
  });

  it('ignores layout changes on the finale', () => {
    const finale = close(focus(close(focus(assembled(), 'a')), 'b'));
    expect(setLayout(finale, 'exploded').screen).toBe('finale');
  });

  it('replays into the layout the viewer was using', () => {
    const finale = close(focus(close(focus(assembled(), 'a')), 'b'));
    expect(replay(finale).screen).toBe('assembled');
  });

  it('knows which screens allow browsing', () => {
    expect(isBrowsing(assembled())).toBe(true);
    expect(isBrowsing(exploded())).toBe(true);
    expect(isBrowsing(createState(IDS))).toBe(false);
    expect(isBrowsing(focus(assembled(), 'a'))).toBe(false);
  });
});

describe('riding', () => {
  it('starts standing still', () => {
    expect(createState(IDS).riding).toBe(false);
  });

  it('keeps the riding choice across layouts and parts', () => {
    const riding = setRiding(setLayout(createState(IDS), 'assembled'), true);
    expect(setLayout(riding, 'exploded').riding).toBe(true);
    expect(close(focus(riding, 'a')).riding).toBe(true);
  });

  it('can be switched off again', () => {
    expect(setRiding(setRiding(createState(IDS), true), false).riding).toBe(false);
  });
});

describe('memories', () => {
  it('starts off', () => {
    expect(createState(IDS).memories).toBe(false);
  });

  it('switching it on also starts the ride, because the photos line the road', () => {
    const s = setMemories(createState(IDS), true);
    expect(s.memories).toBe(true);
    expect(s.riding).toBe(true);
  });

  it('stopping the ride also turns it off', () => {
    const s = setRiding(setMemories(createState(IDS), true), false);
    expect(s.riding).toBe(false);
    expect(s.memories).toBe(false);
  });

  it('can be turned off while the bike keeps riding', () => {
    const s = setMemories(setMemories(createState(IDS), true), false);
    expect(s.memories).toBe(false);
    expect(s.riding).toBe(true);
  });

  it('starting the ride on its own leaves the photos off', () => {
    expect(setRiding(createState(IDS), true).memories).toBe(false);
  });

  it('stays on through layouts and while a part is open', () => {
    const s = setMemories(setLayout(createState(IDS), 'assembled'), true);
    expect(setLayout(s, 'exploded').memories).toBe(true);
    expect(close(focus(s, 'a')).memories).toBe(true);
  });
});
