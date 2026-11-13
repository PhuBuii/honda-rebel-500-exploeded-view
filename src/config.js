// Đổi màu ở đây để chiếc xe giống xe thật.
export const config = {
  colors: {
    paint: '#1b1e20', // bình xăng, chắn bùn
    frame: '#121416',
    engine: '#1a1c1e',
    metal: '#b9bcbd', // chi tiết kim loại sáng
    accent: '#5f4a2c', // vành xe màu đồng
    rubber: '#0d0e0f',
    leather: '#17181a', // yên xe
  },
  sound: {
    volume: 0.5, // độ to tổng của tiếng máy, từ 0 đến 1
    musicVolume: 0.8, // độ to của nhạc nền khi có ảnh kỷ niệm, từ 0 đến 1
  },
  motion: {
    explodeSeconds: 1.6,
    staggerSeconds: 0.06,
    flySeconds: 1.1,
    reducedSeconds: 0.2,
    typingCharsPerSecond: 36,
    autoRotateSpeed: 0.7,
  },
};
