import { createEngineSound } from "./engine-sound.js";
import { createMusic } from "./music.js";

// Gói tiếng máy và nhạc nền dùng chung một AudioContext, để chỗ khác chỉ cần gọi một nơi.
export function createAudio({ musicSrc } = {}) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const engine = createEngineSound(ctx);
  const music = createMusic(ctx, { src: musicSrc });

  return {
    ctx,
    engine,
    music,

    // Phải gọi ngay trong lúc xử lý lần bấm của người xem, nếu không trình duyệt chặn âm thanh.
    unlock() {
      return Promise.all([ctx.resume(), music.prime()]);
    },

    start() {
      engine.start();
    },

    // Ô "Tiếng xe" chỉ tắt hoặc bật tiếng máy; nhạc nền vẫn phát khi dải ảnh kỷ niệm hiện ra.
    setEnabled(on) {
      engine.setEnabled(on);
    },

    // state: { ride, exploded, focused, memories } từ motion.audioState()
    update(dt, state) {
      engine.update(dt, state);
      music.update(dt, state);
    },

    async pause() {
      // music.pause();
      await engine.pause();
    },

    async resume() {
      await engine.resume();
      // music.resume();
    },
  };
}
