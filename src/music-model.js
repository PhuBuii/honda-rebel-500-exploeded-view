// Nhạc nền lãng mạn gốc, thuần số học: tám hợp âm Đô trưởng kiểu "Canon" (Đô, Sol, La thứ, Mi thứ,
// Fa, Đô, Fa, Sol), mỗi ô nhịp rải tám nốt móc đơn như hộp nhạc.

export const BAR_STEPS = 8;
export const BPM = 72;
export const STEP_SECONDS = 60 / BPM / 2; // một nốt móc đơn

// Thứ tự rải trong ô nhịp, chỉ số vào mảng notes của hợp âm: lên rồi xuống.
export const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 1];

// bass: nốt trầm giữ suốt ô nhịp; notes: bốn nốt để rải và để đệm, xếp từ thấp lên cao (số MIDI).
export const CHORDS = [
  { name: 'C', bass: 36, notes: [60, 64, 67, 72] },
  { name: 'G/B', bass: 43, notes: [59, 62, 67, 71] },
  { name: 'Am', bass: 45, notes: [57, 60, 64, 69] },
  { name: 'Em', bass: 40, notes: [55, 59, 64, 67] },
  { name: 'F', bass: 41, notes: [57, 60, 65, 69] },
  { name: 'C/E', bass: 36, notes: [55, 60, 64, 67] },
  { name: 'F', bass: 41, notes: [57, 60, 65, 69] },
  { name: 'G', bass: 43, notes: [55, 59, 62, 67] },
];

export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Nốt ở bước thứ index tính từ lúc bắt đầu, lặp vô tận sau tám ô nhịp.
export function stepAt(index) {
  const total = CHORDS.length * BAR_STEPS;
  const i = ((index % total) + total) % total;
  const chord = CHORDS[Math.floor(i / BAR_STEPS)];
  const inBar = i % BAR_STEPS;
  return { chord, note: chord.notes[ARPEGGIO[inBar]], downbeat: inBar === 0 };
}
