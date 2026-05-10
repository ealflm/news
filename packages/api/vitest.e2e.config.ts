import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    environment: 'node',
    globals: true,
  },
});
