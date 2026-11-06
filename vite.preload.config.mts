import { defineConfig } from 'vite';
import path from 'node:path';

// Two preloads: one for the app window, one for the website preview.
// The preview's is deliberately tiny: it can only report height and clicks.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        preload: path.join(__dirname, 'src/preload.ts'),
        'preview-preload': path.join(__dirname, 'src/preview/preload.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        format: 'cjs',
        codeSplitting: true,
      },
    },
  },
});
