import { defineConfig } from 'vite';
import { content } from './src/content.js';
import { PART_IDS } from './src/part-ids.js';
import { validateContent } from './src/validate-content.js';

// `npm run build` dừng nếu còn lời nhắn chưa điền, để không đưa nhầm bản nháp lên mạng.
// `npm run build:draft` bỏ qua kiểm tra này, dùng để xem thử trên điện thoại.
function requireContent() {
  return {
    name: 'require-content',
    apply: 'build',
    configResolved(resolved) {
      if (resolved.mode === 'draft') return;
      const errors = validateContent(content, PART_IDS);
      if (errors.length) {
        throw new Error(`Hãy điền đủ nội dung trong src/content.js trước khi build:\n  ${errors.join('\n  ')}`);
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [requireContent()],
  build: { chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.js'] },
});
