import { config } from './config.js';
import { musicLevel } from './engine-model.js';
import { BAR_STEPS, midiToHz, STEP_SECONDS, stepAt } from './music-model.js';

// Nhạc nền lãng mạn tổng hợp bằng Web Audio, hoặc phát file của bạn nếu khai báo `music` trong content.js.
// Chỉ phát khi dải ảnh kỷ niệm đang hiện, bật dần cùng ảnh và tắt dần khi ảnh biến mất.
const LOOKAHEAD = 0.25;
const PUMP_MS = 50;
const BAR_SECONDS = STEP_SECONDS * BAR_STEPS;
const FADE = 0.7; // hằng số thời gian của lúc nhạc vào ra, khoảng 2 giây là êm hẳn

// Tiếng vang của một căn phòng lớn: nhiễu tắt dần.
function reverbImpulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
  }
  return buffer;
}

export function createMusic(ctx, { src } = {}) {
  const voices = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  const reverb = ctx.createConvolver();
  reverb.buffer = reverbImpulse(ctx, 2.6);
  const master = ctx.createGain();
  master.gain.value = 0;
  voices.connect(dry).connect(master);
  voices.connect(reverb).connect(wet).connect(master);
  master.connect(ctx.destination);

  let element = null;
  let fileFailed = false;
  if (src) {
    element = new Audio(src);
    element.loop = true;
    element.preload = 'auto';
    ctx.createMediaElementSource(element).connect(master);
    element.addEventListener('error', () => {
      fileFailed = true;
      console.warn(`Không tải được nhạc ${src}, dùng nhạc có sẵn.`);
    });
  }
  const useFile = () => element !== null && !fileFailed;

  let enabled = true;
  let playing = false;
  let silentFor = 0;
  let stepIndex = 0;
  let nextTime = 0;
  let timer = null;
  let level = 0;

  function envelope(param, t, peak, attack, hold, release) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setValueAtTime(peak, t + hold);
    param.exponentialRampToValueAtTime(0.0005, t + release);
  }

  // Một nốt như hộp nhạc hoặc đàn điện: gốc cộng vài hài, tắt nhanh.
  function pluck(freq, t, velocity) {
    for (const [multiple, amount, decay] of [[1, 1, 1.8], [2, 0.32, 1.2], [3, 0.12, 0.8], [4.01, 0.05, 0.5]]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq * multiple;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(velocity * amount, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + decay);
      osc.connect(gain).connect(voices);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }

  function bass(freq, t) {
    for (const type of ['sine', 'triangle']) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      envelope(gain.gain, t, type === 'sine' ? 0.2 : 0.07, 0.06, BAR_SECONDS - 0.5, BAR_SECONDS);
      osc.connect(gain).connect(voices);
      osc.start(t);
      osc.stop(t + BAR_SECONDS + 0.05);
    }
  }

  // Nền đệm ấm: mỗi nốt hai sóng tam giác lệch nhau vài cent, vào chậm, ra chậm.
  function pad(notes, t) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(voices);
    for (const note of notes) {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = midiToHz(note);
        osc.detune.value = detune;
        const gain = ctx.createGain();
        envelope(gain.gain, t, 0.035, 1.2, BAR_SECONDS - 0.2, BAR_SECONDS + 1.2);
        osc.connect(gain).connect(filter);
        osc.start(t);
        osc.stop(t + BAR_SECONDS + 1.3);
      }
    }
  }

  function scheduleUntil(until) {
    while (nextTime < until) {
      const { chord, note, downbeat } = stepAt(stepIndex);
      // Lệch giờ và độ mạnh một chút cho nghe như người chơi, không máy móc.
      const t = Math.max(0, nextTime + (Math.random() - 0.5) * 0.016);
      if (downbeat) {
        bass(midiToHz(chord.bass), t);
        pad(chord.notes.map((n) => n - 12), t);
      }
      pluck(midiToHz(note), t, (downbeat ? 0.5 : 0.36) * (0.92 + Math.random() * 0.16));
      stepIndex += 1;
      nextTime += STEP_SECONDS;
    }
  }

  function startPump() {
    if (timer !== null) return;
    timer = setInterval(() => {
      if (playing && ctx.state === 'running' && !useFile()) scheduleUntil(ctx.currentTime + LOOKAHEAD);
    }, PUMP_MS);
  }

  function begin() {
    playing = true;
    silentFor = 0;
    stepIndex = 0; // mỗi lần ảnh hiện ra, bản nhạc bắt đầu lại từ ô nhịp đầu
    nextTime = ctx.currentTime + 0.1;
    if (useFile()) {
      element.currentTime = 0;
      element.play().catch(() => {});
    }
    startPump();
  }

  function end() {
    playing = false;
    if (element) element.pause();
  }

  return {
    get level() {
      return level;
    },

    // Gọi trong lúc xử lý lần bấm đầu tiên: iOS chỉ cho phát file sau thao tác thật của người dùng.
    prime() {
      if (!useFile()) return Promise.resolve();
      return element
        .play()
        .then(() => {
          element.pause();
          element.currentTime = 0;
        })
        .catch(() => {});
    },

    setEnabled(on) {
      enabled = on;
    },

    // Gọi mỗi khung hình với memories là mức dải ảnh đang hiện (0 đến 1).
    update(dt, { memories }) {
      level = musicLevel({ memories, enabled });
      master.gain.setTargetAtTime(level * config.sound.musicVolume, ctx.currentTime, FADE);
      if (level > 0.01 && !playing) begin();
      if (level > 0) silentFor = 0;
      else if (playing) {
        silentFor += dt;
        if (silentFor > 3) end(); // đã im hẳn thì dừng hẳn, không lên lịch nốt vô ích
      }
    },

    pause() {
      clearInterval(timer);
      timer = null;
      if (element) element.pause();
    },

    resume() {
      if (!playing) return;
      if (useFile()) element.play().catch(() => {});
      startPump();
    },

    // Chỉ để render thử không cần nghe: phát ngay từ đầu, to hết cỡ.
    forcePlaying() {
      playing = true;
      stepIndex = 0;
      nextTime = 0;
      master.gain.value = config.sound.musicVolume;
    },

    scheduleUntil,
  };
}
