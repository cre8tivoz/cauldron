import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(({ command }) => ({
  define: {
    // Production packages (`command === 'build'`) omit the internal E2E harness
    // unless explicitly opted in via `CAULDRON_BUNDLE_E2E=1`.
    __CAULDRON_E2E__: JSON.stringify(
      command === 'serve' || process.env.CAULDRON_BUNDLE_E2E === '1',
    ),
  },
}));
