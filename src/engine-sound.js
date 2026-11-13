import { config } from './config.js';
import {
  approach,
  CRANK_RPM,
  CRANKING_SECONDS,
  degreesPerSecond,
  engineLevel,
  firingsBetween,
  FLARE_RPM,
  targetRpm,
} from './engine-model.js';

// Tiếng máy tổng hợp bằng Web Audio, không dùng file thu âm: mỗi lần nổ của hai xi-lanh là một tiếng
// "bụp" trầm cộng một cú "sủa" ở dải giữa, xếp theo nhịp 180° của máy Rebel 500.
const LOOKAHEAD = 0.14; // lên lịch trước bao nhiêu giây để tiếng không bị đứt khi trang bận
const STEP = 0.01; // độ mịn khi tiến góc trục khuỷu
const PUMP_MS = 25;
const MISFIRE_WEIGHT = 0.35; // lúc củ đề quay, máy mới nổ lụp bụp yếu

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Đường cong bão hoà mềm: sinh thêm hài cho tiếng trầm, loa nhỏ mới nghe được.
function softClip(amount) {
  const curve = new Float32Array(1024);
  curve.forEach((_, i) => {
    const x = (i / 1023) * 2 - 1;
    curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
  });
  return curve;
}

export function createEngineSound(ctx = new (window.AudioContext || window.webkitAudioContext)()) {
  const noise = noiseBuffer(ctx, 1);

  const bus = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3000;
  tone.Q.value = 0.6;
  const shaper = ctx.createWaveShaper();
  shaper.curve = softClip(4.5);
  shaper.oversample = '2x';
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.value = 0;
  bus.connect(tone).connect(shaper).connect(compressor).connect(master).connect(ctx.destination);

  // Hai lớp liên tục: tiếng cò mổ xu-páp ở dải cao và tiếng hút gió khi mở ga.
  function loopedNoise(filterType, frequency, q) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(bus);
    source.start();
    return gain;
  }
  const valveGain = loopedNoise('highpass', 2800, 0.7);
  const airGain = loopedNoise('bandpass', 520, 0.8);

  let rpm = 0;
  let crank = -1; // góc trục khuỷu tích luỹ, bắt đầu ngay trước lần nổ đầu tiên
  let scheduledTo = 0;
  let startedAt = null;
  let caught = false;
  let enabled = true;
  let audible = false;
  let clock = 0;
  let fixedRpm = null; // chỉ dùng khi render thử, giữ vòng tua không đổi
  let level = 0;
  let timer = null;

  function fire(t, cylinder, weight, rpmNow) {
    const speed = Math.min(rpmNow / 6000, 1);
    const peak = weight * (cylinder === 0 ? 1 : 0.88) * (0.7 + 0.3 * speed); // hai xi-lanh nổ không đều tay
    const decay = 0.15 - 0.06 * speed;
    const f0 = (cylinder === 0 ? 108 : 100) + 50 * speed;

    // Tiếng "bụp" trầm: sóng sin tụt tần, kèm hài bậc hai để loa nhỏ vẫn nghe được.
    for (const [type, multiple, level] of [['sine', 1, 0.45], ['triangle', 2, 0.8], ['sawtooth', 3, 0.4]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f0 * multiple, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * multiple * 0.5, t + decay);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak * level, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      osc.connect(gain).connect(bus);
      osc.start(t);
      osc.stop(t + decay + 0.02);
    }

    // Cú "sủa" ở dải giữa: nhiễu qua bộ lọc, ngắn hơn tiếng trầm.
    const bark = ctx.createBufferSource();
    bark.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420 + 300 * speed;
    band.Q.value = 0.6;
    const barkGain = ctx.createGain();
    barkGain.gain.setValueAtTime(0.0001, t);
    barkGain.gain.linearRampToValueAtTime(peak * 1.7, t + 0.003);
    barkGain.gain.exponentialRampToValueAtTime(0.0008, t + decay * 0.7);
    bark.connect(band).connect(barkGain).connect(bus);
    bark.start(t, Math.random() * 0.8, decay);
  }

  // Củ đề: tiếng rít trầm có nhịp theo từng kỳ nén, tắt khi máy vừa nổ.
  function starter(t0) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t0);
    osc.frequency.linearRampToValueAtTime(210, t0 + CRANKING_SECONDS);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.09, t0 + 0.08);
    gain.gain.setValueAtTime(0.09, t0 + CRANKING_SECONDS - 0.05);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + CRANKING_SECONDS + 0.05);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.045;
    lfo.connect(lfoDepth).connect(gain.gain);
    osc.connect(filter).connect(gain).connect(bus);
    for (const node of [osc, lfo]) {
      node.start(t0);
      node.stop(t0 + CRANKING_SECONDS + 0.1);
    }
  }

  function scheduleUntil(until) {
    scheduledTo = Math.max(scheduledTo, ctx.currentTime);
    if (!audible) {
      scheduledTo = until;
      return;
    }
    while (scheduledTo < until) {
      const t = scheduledTo;
      const cranking = startedAt !== null && t < startedAt + CRANKING_SECONDS;
      const speed = fixedRpm ?? (cranking ? CRANK_RPM : rpm);
      if (startedAt !== null && t >= startedAt && speed > 0) {
        const advance = degreesPerSecond(speed) * STEP;
        for (const f of firingsBetween(crank, crank + advance)) {
          const at = t + ((f.angle - crank) / advance) * STEP;
          fire(at, f.cylinder, cranking ? MISFIRE_WEIGHT : 1, speed);
        }
        crank += advance;
      }
      scheduledTo += STEP;
    }
  }

  function startPump() {
    if (timer !== null) return;
    timer = setInterval(() => {
      if (ctx.state === 'running') scheduleUntil(ctx.currentTime + LOOKAHEAD);
    }, PUMP_MS);
  }

  return {
    ctx,

    get rpm() {
      return rpm;
    },

    get level() {
      return level;
    },

    // Phải gọi ngay trong lúc xử lý lần bấm của người xem, nếu không trình duyệt chặn âm thanh.
    unlock() {
      return ctx.resume();
    },

    // Nổ máy: củ đề quay khoảng một giây rồi máy nổ, ga vọt lên và hạ về cầm chừng.
    start() {
      if (startedAt !== null) return;
      startedAt = ctx.currentTime + 0.05;
      starter(startedAt);
      startPump();
    },

    // Gọi mỗi khung hình: ride (0 đứng yên, 1 chạy), exploded (0 đến 1), focused, memories (0 đến 1).
    update(dt, { ride, exploded, focused, memories }) {
      clock += dt;
      const now = ctx.currentTime;
      const started = startedAt !== null && now >= startedAt;
      const cranking = started && now < startedAt + CRANKING_SECONDS;
      if (fixedRpm === null) {
        if (cranking) rpm = CRANK_RPM;
        else if (started) {
          if (!caught) {
            caught = true;
            rpm = FLARE_RPM;
          }
          rpm = approach(rpm, targetRpm(ride, clock), dt);
        }
      }
      level = started ? engineLevel({ ride, exploded, focused, enabled, memories }) : 0;
      audible = level > 0.002;
      master.gain.setTargetAtTime(level * config.sound.volume, now, 0.08);
      const run = started && !cranking ? Math.min(rpm / 4000, 1) : 0;
      valveGain.gain.setTargetAtTime(run ? 0.008 + 0.02 * run : 0, now, 0.1);
      airGain.gain.setTargetAtTime(started ? 0.035 * Math.min(Math.max(ride, 0), 1) : 0, now, 0.2);
    },

    setEnabled(on) {
      enabled = on;
    },

    // Tạm dừng khi trang bị ẩn để tiếng máy không kêu ngầm.
    async pause() {
      clearInterval(timer);
      timer = null;
      await ctx.suspend();
    },

    async resume() {
      await ctx.resume();
      if (startedAt !== null) startPump();
    },

    // Chỉ để render thử không cần nghe: máy chạy sẵn ở một vòng tua cố định, to hết cỡ.
    forceRunning(fixed) {
      fixedRpm = fixed;
      startedAt = -10;
      caught = true;
      audible = true;
      master.gain.value = config.sound.volume;
    },

    scheduleUntil,
  };
}
