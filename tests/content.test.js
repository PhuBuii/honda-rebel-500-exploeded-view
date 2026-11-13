import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { content } from '../src/content.js';
import { PART_IDS } from '../src/part-ids.js';
import { validateContent } from '../src/validate-content.js';

const complete = () => ({
  opening: 'Mở đầu',
  finale: 'Lời cuối',
  parts: { a: { name: 'A', quote: 'Lời A' }, b: { name: 'B', quote: 'Lời B' } },
});

describe('validateContent', () => {
  it('accepts complete content', () => {
    expect(validateContent(complete(), ['a', 'b'])).toEqual([]);
  });

  it('reports a missing part', () => {
    const c = complete();
    delete c.parts.b;
    expect(validateContent(c, ['a', 'b'])).toEqual(['b: thiếu bộ phận']);
  });

  it('reports an empty quote', () => {
    const c = complete();
    c.parts.a.quote = '   ';
    expect(validateContent(c, ['a', 'b'])).toEqual(['a: chưa có lời nhắn']);
  });

  it('reports a leftover placeholder quote', () => {
    const c = complete();
    c.parts.a.quote = '[ĐIỀN lời nhắn]';
    expect(validateContent(c, ['a', 'b'])).toEqual(['a: chưa có lời nhắn']);
  });

  it('reports placeholder opening and finale', () => {
    const c = complete();
    c.opening = '[ĐIỀN câu mở đầu]';
    c.finale = '';
    expect(validateContent(c, ['a', 'b'])).toEqual([
      'opening: chưa có lời nhắn',
      'finale: chưa có lời nhắn',
    ]);
  });

  it('reports a part without a name', () => {
    const c = complete();
    c.parts.a.name = '';
    expect(validateContent(c, ['a', 'b'])).toEqual(['a: thiếu tên']);
  });
});

describe('content.js', () => {
  it('has an entry with a name for every part', () => {
    expect(Object.keys(content.parts).sort()).toEqual([...PART_IDS].sort());
    for (const id of PART_IDS) expect(content.parts[id].name).toBeTruthy();
  });

  it('keeps the motion caption as text, which may be left empty', () => {
    for (const id of PART_IDS) expect(typeof content.parts[id].action, id).toBe('string');
  });

  it('points every photo at a file that exists in public/', () => {
    for (const photo of content.photos ?? []) {
      expect(fs.existsSync(path.join('public', photo.src)), photo.src).toBe(true);
    }
  });
});

describe('validateContent photos', () => {
  const withPhotos = (photos) => ({ ...complete(), photos });

  it('accepts content that has no photos at all', () => {
    expect(validateContent(complete(), ['a', 'b'])).toEqual([]);
    expect(validateContent(withPhotos([]), ['a', 'b'])).toEqual([]);
  });

  it('accepts a real photo, with or without a caption', () => {
    const photos = [{ src: 'photos/da-lat.jpg', caption: 'Đà Lạt' }, { src: 'photos/bien.jpg' }];
    expect(validateContent(withPhotos(photos), ['a', 'b'])).toEqual([]);
  });

  it('reports a placeholder caption', () => {
    const photos = [{ src: 'photos/a.jpg', caption: '[ĐIỀN chú thích ảnh 1]' }];
    expect(validateContent(withPhotos(photos), ['a', 'b'])).toEqual(['photos[0]: chưa có chú thích']);
  });

  it('reports a photo without a path', () => {
    expect(validateContent(withPhotos([{ src: '  ' }]), ['a', 'b'])).toEqual(['photos[0]: thiếu đường dẫn ảnh']);
  });

  it('reports a sample photo that was never replaced', () => {
    const photos = [{ src: 'photos/sample-1.svg', caption: 'Đà Lạt' }];
    expect(validateContent(withPhotos(photos), ['a', 'b'])).toEqual(['photos[0]: vẫn là ảnh mẫu']);
  });
});
